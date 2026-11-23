package com.auramart.catalog.config;

import com.auramart.catalog.cache.CacheKeys;
import com.auramart.catalog.dto.PagedResponse;
import com.auramart.catalog.dto.ProductResponse;
import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.data.redis.cache.BatchStrategies;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.cache.RedisCacheWriter;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.JacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.json.JsonMapper;

/**
 * Steps 4.1-4.3, 4.8, 4.10, 4.13: Redis as the cache behind @Cacheable / @CacheEvict.
 *
 * Order: the cache advice runs OUTSIDE the transaction (order just before the transaction advice,
 * which is LOWEST_PRECEDENCE). So a cache hit never borrows a DB connection, and @CacheEvict runs
 * after the commit, when the new data is already visible to the next reader.
 */
@Slf4j
@Configuration(proxyBeanMethods = false)
@EnableCaching(order = Ordered.LOWEST_PRECEDENCE - 1)
public class CacheConfig implements CachingConfigurer {

    /** How long a cached product or page lives before it is read again from the database. */
    static final Duration BASE_TTL = Duration.ofMinutes(10);
    /** Up to 2 extra minutes, random per entry, so entries cached together do not expire together. */
    static final Duration MAX_JITTER = Duration.ofMinutes(2);
    /** A "not found" answer is cached briefly: long enough to absorb a flood, short enough to self-heal. */
    static final Duration NOT_FOUND_TTL = Duration.ofSeconds(60);

    @Bean
    RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory, JsonMapper jsonMapper) {
        RedisCacheWriter writer = RedisCacheWriter.create(connectionFactory, writerConfig -> writerConfig
                // SCAN instead of KEYS when a whole cache is cleared: KEYS blocks Redis while it walks every key.
                .batchStrategy(BatchStrategies.scan(1000))
                // Wait for Redis to confirm every put/evict. The default (Spring Data Redis 4 + Lettuce) is
                // fire-and-forget: @CacheEvict returned before the delete happened, so the next read could
                // still get the old page, and a slow put could even land after the evict. Found by
                // ProductCacheIntegrationTest.searchPageIsCachedAndDroppedWhenAProductIsUpdated.
                .immediateWrites()
                // Hits and misses, exported as the cache.gets metric (step 4.13).
                .collectStatistics());

        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .computePrefixWith(cacheName -> "catalog:" + cacheName + "::")
                .entryTtl(ttlWithJitter());

        // Typed JSON per cache: readable in redis-cli, no Java class names stored in Redis,
        // and a renamed class cannot break deserialisation of a polymorphic "@class" field.
        JavaType pageType = jsonMapper.getTypeFactory()
                .constructParametricType(PagedResponse.class, ProductResponse.class);
        RedisCacheConfiguration productCache = defaults.serializeValuesWith(SerializationPair.fromSerializer(
                new JacksonJsonRedisSerializer<>(jsonMapper, ProductResponse.class)));
        RedisCacheConfiguration pageCache = defaults
                .disableCachingNullValues()
                .serializeValuesWith(SerializationPair.fromSerializer(
                        new JacksonJsonRedisSerializer<PagedResponse<ProductResponse>>(jsonMapper, pageType)));

        return RedisCacheManager.builder(writer)
                .cacheDefaults(defaults)
                .withCacheConfiguration(CacheKeys.PRODUCT, productCache)
                .withCacheConfiguration(CacheKeys.PRODUCT_LIST, pageCache)
                .withCacheConfiguration(CacheKeys.PRODUCT_SEARCH, pageCache)
                .disableCreateOnMissingCache()   // a typo in a cache name fails loudly, not silently
                .build();
    }

    /**
     * Step 4.8 (jitter) and 4.10 (negative caching). value is null when the method returned
     * Optional.empty(), i.e. the product does not exist: keep that answer only 60 s.
     */
    static RedisCacheWriter.TtlFunction ttlWithJitter() {
        return (key, value) -> value == null
                ? NOT_FOUND_TTL
                : BASE_TTL.plusMillis(ThreadLocalRandom.current().nextLong(MAX_JITTER.toMillis() + 1));
    }

    /**
     * The cache only makes things faster. If Redis is down or slow, log it and carry on:
     * the method then runs against the database as if there were no cache.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException ex, Cache cache, Object key) {
                log.warn("Cache get failed, reading from the database. cache={} key={}: {}",
                        cache.getName(), key, ex.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException ex, Cache cache, Object key, Object value) {
                log.warn("Cache put failed. cache={} key={}: {}", cache.getName(), key, ex.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException ex, Cache cache, Object key) {
                // Worst case: a stale entry lives until its TTL ends (at most 12 minutes).
                log.error("Cache evict failed, entry may be stale until its TTL. cache={} key={}: {}",
                        cache.getName(), key, ex.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException ex, Cache cache) {
                log.error("Cache clear failed, pages may be stale until their TTL. cache={}: {}",
                        cache.getName(), ex.getMessage());
            }
        };
    }
}
