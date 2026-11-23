package com.auramart.catalog.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.auramart.catalog.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.cache.RedisCache;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Proves the cache with real Redis. The trick: change a row directly in the database (JdbcTemplate),
 * behind the cache's back. If the API still returns the old value, the answer came from Redis.
 */
@SpringBootTest(properties = "spring.datasource.password=unused-by-testcontainers")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ProductCacheIntegrationTest {

    private static final String BASE = "/api/v1/products";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private StringRedisTemplate redis;

    @Autowired
    private CacheManager cacheManager;

    @Test
    void productIsServedFromTheCacheUntilAnUpdateEvictsIt() throws Exception {
        String id = create(uniqueSku(), "Cached Kettle", "kitchen");

        mvc.perform(get(BASE + "/" + id)).andExpect(jsonPath("$.name").value("Cached Kettle"));   // miss: stored
        jdbc.update("UPDATE products SET name = 'Changed Behind The Cache' WHERE id = ?", UUID.fromString(id));

        // Still the old name: this answer did not touch the database.
        mvc.perform(get(BASE + "/" + id)).andExpect(jsonPath("$.name").value("Cached Kettle"));

        String updatedAt = JsonPath.read(
                mvc.perform(get(BASE + "/" + id)).andReturn().getResponse().getContentAsString(), "$.updatedAt");
        mvc.perform(put(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content(body(uniqueSku(), "Updated Kettle", "kitchen", updatedAt)))
                .andExpect(status().isOk());

        // The update evicted the entry, so this read goes to the database and sees the new name.
        mvc.perform(get(BASE + "/" + id)).andExpect(jsonPath("$.name").value("Updated Kettle"));
    }

    @Test
    void deleteEvictsTheProduct() throws Exception {
        String id = create(uniqueSku(), "Short Lived Lamp", "home");
        mvc.perform(get(BASE + "/" + id)).andExpect(status().isOk());       // now cached

        mvc.perform(delete(BASE + "/" + id)).andExpect(status().isNoContent());

        mvc.perform(get(BASE + "/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void entriesGetTenMinutesPlusJitterAndNotFoundGetsSixtySeconds() throws Exception {
        String id = create(uniqueSku(), "Jitter Bottle", "kitchen");
        mvc.perform(get(BASE + "/" + id)).andExpect(status().isOk());
        Long foundTtl = redis.getExpire("catalog:product::" + id);
        assertThat(foundTtl).isBetween(590L, 720L);

        UUID missing = UUID.randomUUID();
        mvc.perform(get(BASE + "/" + missing)).andExpect(status().isNotFound());
        Long notFoundTtl = redis.getExpire("catalog:product::" + missing);
        assertThat(notFoundTtl).isBetween(1L, 60L);
    }

    @Test
    void notFoundIsCachedSoRepeatedMissesSkipTheDatabase() throws Exception {
        RedisCache cache = (RedisCache) cacheManager.getCache(CacheKeys.PRODUCT);
        UUID missing = UUID.randomUUID();

        mvc.perform(get(BASE + "/" + missing)).andExpect(status().isNotFound());   // miss, "not found" stored
        long hitsBefore = cache.getStatistics().getHits();
        mvc.perform(get(BASE + "/" + missing)).andExpect(status().isNotFound());   // hit on the marker

        assertThat(cache.getStatistics().getHits()).isEqualTo(hitsBefore + 1);
    }

    @Test
    void listPageIsCachedAndDroppedWhenAProductIsCreated() throws Exception {
        String category = "cache-" + UUID.randomUUID().toString().substring(0, 8);
        String id = create(uniqueSku(), "First In Category", category);

        mvc.perform(get(BASE).param("category", category))
                .andExpect(jsonPath("$.page.totalElements").value(1));
        jdbc.update("UPDATE products SET name = 'Renamed Behind The Cache' WHERE id = ?", UUID.fromString(id));
        mvc.perform(get(BASE).param("category", category.toUpperCase()))   // same cache entry: key is lower-cased
                .andExpect(jsonPath("$.content[0].name").value("First In Category"));

        create(uniqueSku(), "Second In Category", category);

        mvc.perform(get(BASE).param("category", category))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].name").value("Renamed Behind The Cache"));  // sorted by name
    }

    @Test
    void searchPageIsCachedAndDroppedWhenAProductIsUpdated() throws Exception {
        // Assert on this product's own names only: fuzzy search may also match other tests' products.
        String word = "zq" + UUID.randomUUID().toString().substring(0, 6);
        String sku = uniqueSku();
        String id = create(sku, "Lamp " + word, "home");
        String byId = "$.content[?(@.id == '" + id + "')].name";

        mvc.perform(get(BASE + "/search").param("q", word))
                .andExpect(jsonPath(byId).value(hasItem("Lamp " + word)));
        jdbc.update("UPDATE products SET name = ? WHERE id = ?", "Renamed " + word, UUID.fromString(id));
        mvc.perform(get(BASE + "/search").param("q", word.toUpperCase()))   // same entry: key is lower-cased
                .andExpect(jsonPath(byId).value(hasItem("Lamp " + word)));

        String updatedAt = JsonPath.read(
                mvc.perform(get(BASE + "/" + id)).andReturn().getResponse().getContentAsString(), "$.updatedAt");
        mvc.perform(put(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content(body(sku, "Desk Light " + word, "home", updatedAt)))
                .andExpect(status().isOk());

        // The update cleared every cached search page, so the new name shows at once.
        mvc.perform(get(BASE + "/search").param("q", word))
                .andExpect(jsonPath(byId).value(hasItem("Desk Light " + word)));
    }

    private String create(String sku, String name, String category) throws Exception {
        String json = mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON)
                        .content(body(sku, name, category, null)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.id");
    }

    private static String body(String sku, String name, String category, String expectedUpdatedAt) {
        String expected = expectedUpdatedAt == null ? "null" : "\"" + expectedUpdatedAt + "\"";
        return """
                {"sku":"%s","name":"%s","description":"Used in cache tests","category":"%s",
                 "brand":"AuraCache","price":299.00,"currency":"INR","stockQuantity":3,"expectedUpdatedAt":%s}
                """.formatted(sku, name, category, expected);
    }

    private static String uniqueSku() {
        return "CT-" + UUID.randomUUID().toString().toUpperCase();
    }
}
