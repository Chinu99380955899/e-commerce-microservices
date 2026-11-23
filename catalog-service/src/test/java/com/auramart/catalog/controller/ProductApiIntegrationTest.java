package com.auramart.catalog.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.auramart.catalog.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The real stack: HTTP → controller → service → JPA → Flyway-migrated PostgreSQL (Testcontainers).
 * Each test uses its own SKU, so tests do not depend on each other's data.
 */
@SpringBootTest(properties = "spring.datasource.password=unused-by-testcontainers")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ProductApiIntegrationTest {

    private static final String BASE = "/api/v1/products";

    @Autowired
    private MockMvc mvc;

    @Test
    void createThenGetReturnsTheProduct() throws Exception {
        String sku = uniqueSku();
        String id = create(sku, "Steel Water Bottle", 5);

        mvc.perform(get(BASE + "/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value(sku))
                .andExpect(jsonPath("$.category").value("kitchen"))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.inStock").value(true))
                .andExpect(header().exists("X-Request-Id"));
    }

    @Test
    void duplicateSkuIsAConflict() throws Exception {
        String sku = uniqueSku();
        create(sku, "First", 1);

        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(body(sku, "Second", 1, null)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value("https://auramart.dev/problems/duplicate-sku"));
    }

    @Test
    void invalidBodyIsAValidationError() throws Exception {
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(body("bad sku!", "", -1, null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("https://auramart.dev/problems/validation-error"))
                .andExpect(jsonPath("$.errors.sku").exists())
                .andExpect(jsonPath("$.errors.stockQuantity").exists());
    }

    @Test
    void badUuidIsAValidationErrorAndMissingIsNotFound() throws Exception {
        mvc.perform(get(BASE + "/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.id").exists());

        mvc.perform(get(BASE + "/" + UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("https://auramart.dev/problems/product-not-found"));
    }

    @Test
    void staleUpdateIsAConflictAndFreshUpdateSucceeds() throws Exception {
        String sku = uniqueSku();
        String id = create(sku, "Yoga Mat", 4);
        String updatedAt = JsonPath.read(
                mvc.perform(get(BASE + "/" + id)).andReturn().getResponse().getContentAsString(), "$.updatedAt");

        mvc.perform(put(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content(body(sku, "Yoga Mat Pro", 4, updatedAt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Yoga Mat Pro"));

        // Same expectedUpdatedAt again: the product has changed since, so this copy is stale.
        mvc.perform(put(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content(body(sku, "Yoga Mat Max", 4, updatedAt)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value("https://auramart.dev/problems/concurrent-update"));
    }

    @Test
    void deleteHidesTheProduct() throws Exception {
        String id = create(uniqueSku(), "Old Lamp", 2);

        mvc.perform(delete(BASE + "/" + id)).andExpect(status().isNoContent());
        mvc.perform(get(BASE + "/" + id)).andExpect(status().isNotFound());
        mvc.perform(delete(BASE + "/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void searchToleratesTyposAndHidesDeletedProducts() throws Exception {
        create(uniqueSku(), "Wireless Noise Cancelling Headphones", 3);
        String deletedId = create(uniqueSku(), "Studio Headphones Deleted", 3);
        mvc.perform(delete(BASE + "/" + deletedId)).andExpect(status().isNoContent());

        mvc.perform(get(BASE + "/search").param("q", "hedphones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].name").value(hasItem("Wireless Noise Cancelling Headphones")))
                .andExpect(jsonPath("$.content[*].name").value(not(hasItem("Studio Headphones Deleted"))));
    }

    @Test
    void searchAlsoMatchesTheBrandWithATypo() throws Exception {
        // Every product in this test class has the brand "AuraTest". "auratesst" (double s) scores 0.73;
        // a typo that drops letters, like "auraest", scores 0.55 and is below pg_trgm's 0.6 threshold.
        create(uniqueSku(), "Brand Search Product", 1);

        mvc.perform(get(BASE + "/search").param("q", "auratesst").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].name").value(hasItem("Brand Search Product")));
    }

    @Test
    void blankSearchIsAValidationError() throws Exception {
        mvc.perform(get(BASE + "/search").param("q", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("https://auramart.dev/problems/validation-error"));
    }

    @Test
    void listRejectsAnUnknownSortField() throws Exception {
        mvc.perform(get(BASE).param("sort", "sku,asc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void openApiDocsListTheProductEndpoints() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("AuraMart Catalog API"))
                .andExpect(jsonPath("$.paths['/api/v1/products/search']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/products/{id}']").exists());
    }

    private String create(String sku, String name, int stock) throws Exception {
        String json = mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(body(sku, name, stock, null)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.id");
    }

    private static String body(String sku, String name, int stock, String expectedUpdatedAt) {
        String expected = expectedUpdatedAt == null ? "null" : "\"" + expectedUpdatedAt + "\"";
        return """
                {"sku":"%s","name":"%s","description":"Used in integration tests","category":"Kitchen",
                 "brand":"AuraTest","price":499.00,"currency":"inr","stockQuantity":%d,"expectedUpdatedAt":%s}
                """.formatted(sku, name, stock, expected);
    }

    private static String uniqueSku() {
        return "IT-" + UUID.randomUUID().toString().toUpperCase();
    }
}
