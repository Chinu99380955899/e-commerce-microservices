package com.auramart.catalog.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.auramart.catalog.TestcontainersConfiguration;
import com.auramart.catalog.dto.ProductRequest;
import com.auramart.catalog.dto.ProductResponse;
import com.auramart.catalog.service.ProductService;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Step 4.9 with real Redis. A slow loader (200 ms) makes the requests overlap for sure, so the test
 * would fail without the lock: every request would run the loader.
 * Same annotations as the other integration tests, so Spring reuses one started context.
 */
@SpringBootTest(properties = "spring.datasource.password=unused-by-testcontainers")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SingleFlightRedisCacheTest {

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private StringRedisTemplate redis;

    @Autowired
    private ProductService productService;

    @Test
    void twentyConcurrentMissesRunTheLoaderOnce() throws Exception {
        SingleFlightRedisCache cache = productCache();
        UUID id = UUID.randomUUID();
        AtomicInteger loads = new AtomicInteger();
        Callable<ProductResponse> slowLoader = () -> {
            loads.incrementAndGet();
            Thread.sleep(200);
            return product(id);
        };

        List<ProductResponse> results = runConcurrently(20, () -> cache.get(id, slowLoader));

        assertThat(loads).hasValue(1);
        assertThat(results).hasSize(20).allSatisfy(result -> assertThat(result.id()).isEqualTo(id));
    }

    @Test
    void concurrentRequestsForOneProductStoreItOnce() throws Exception {
        // End to end through the real service, repository and database.
        UUID id = productService.create(new ProductRequest("SF-" + UUID.randomUUID().toString().toUpperCase(),
                "Single Flight Speaker", "Used in stampede tests", "electronics", "AuraTest",
                new BigDecimal("999.00"), "INR", 4, null)).id();
        SingleFlightRedisCache cache = productCache();
        long putsBefore = cache.getStatistics().getPuts();

        List<ProductResponse> results = runConcurrently(20, () -> productService.getActive(id));

        assertThat(results).allSatisfy(result -> assertThat(result.name()).isEqualTo("Single Flight Speaker"));
        assertThat(cache.getStatistics().getPuts() - putsBefore).isEqualTo(1);   // one load, one store
    }

    @Test
    void aCrashedLockHolderOnlyDelaysTheOthers() {
        // A pod that took the lock and died: nobody releases the lock, it only expires.
        SingleFlightRedisCache cache = productCache();
        UUID id = UUID.randomUUID();
        redis.opsForValue().set(cache.lockKey(id), "crashed-pod", Duration.ofMillis(300));
        AtomicInteger loads = new AtomicInteger();

        long start = System.nanoTime();
        ProductResponse result = cache.get(id, () -> {
            loads.incrementAndGet();
            return product(id);
        });
        long waitedMs = (System.nanoTime() - start) / 1_000_000;

        assertThat(result.id()).isEqualTo(id);
        assertThat(loads).hasValue(1);
        assertThat(waitedMs).isBetween(250L, 3000L);
    }

    @Test
    void aWaiterReadsTheDatabaseItselfAfterMaxWait() {
        // A loader that holds the lock far too long. With maxWait 200 ms the waiter stops waiting.
        SingleFlightRedisCache production = productCache();
        SingleFlightRedisCache impatient = new SingleFlightRedisCache(CacheKeys.PRODUCT,
                production.getNativeCache(), production.getCacheConfiguration(), redis,
                new SingleFlightRedisCache.Settings(Duration.ofSeconds(10), Duration.ofMillis(200), Duration.ofMillis(20)));
        UUID id = UUID.randomUUID();
        String lockKey = impatient.lockKey(id);
        redis.opsForValue().set(lockKey, "stuck-loader", Duration.ofSeconds(10));
        try {
            long start = System.nanoTime();
            ProductResponse result = impatient.get(id, () -> product(id));
            long waitedMs = (System.nanoTime() - start) / 1_000_000;

            assertThat(result.id()).isEqualTo(id);
            assertThat(waitedMs).isBetween(180L, 2000L);
        } finally {
            redis.delete(lockKey);
        }
    }

    @Test
    void aFailedLoadReleasesTheLockSoTheNextRequestCanLoad() {
        SingleFlightRedisCache cache = productCache();
        UUID id = UUID.randomUUID();
        Callable<ProductResponse> failing = () -> {
            throw new IllegalStateException("database down");
        };

        assertThatThrownBy(() -> cache.get(id, failing))
                .isInstanceOf(Cache.ValueRetrievalException.class)
                .hasRootCauseMessage("database down");
        assertThat(redis.hasKey(cache.lockKey(id))).isFalse();

        assertThat(cache.get(id, () -> product(id)).id()).isEqualTo(id);
    }

    @Test
    void valuesStoredUnderTheLockKeepTheirOwnTtl() {
        // The lock path stores with put(), so the TTL rule sees the value: 10-12 min, or 60 s for "not found".
        SingleFlightRedisCache cache = productCache();
        UUID found = UUID.randomUUID();
        UUID missing = UUID.randomUUID();

        cache.get(found, () -> product(found));
        cache.get(missing, () -> null);

        assertThat(redis.getExpire("catalog:product::" + found)).isBetween(590L, 720L);
        assertThat(redis.getExpire("catalog:product::" + missing)).isBetween(1L, 60L);
    }

    private SingleFlightRedisCache productCache() {
        return (SingleFlightRedisCache) cacheManager.getCache(CacheKeys.PRODUCT);
    }

    private static ProductResponse product(UUID id) {
        return new ProductResponse(id, "SF-TEST", "Loaded Product", "Loaded by a test", "electronics", "AuraTest",
                new BigDecimal("10.00"), "INR", 1, true, Instant.parse("2026-01-01T00:00:00Z"));
    }

    /** Starts all tasks at the same instant (a start gate), so they really race each other. */
    private static <T> List<T> runConcurrently(int count, Callable<T> task) throws Exception {
        CountDownLatch startGate = new CountDownLatch(1);
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<T>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                futures.add(pool.submit(() -> {
                    startGate.await();
                    return task.call();
                }));
            }
            startGate.countDown();
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) {
                results.add(future.get(10, TimeUnit.SECONDS));
            }
            return results;
        }
    }
}
