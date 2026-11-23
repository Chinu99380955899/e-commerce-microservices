package com.auramart.catalog.cache;

import java.util.Map;
import org.springframework.data.redis.cache.RedisCache;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.cache.RedisCacheWriter;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * A RedisCacheManager whose caches are {@link SingleFlightRedisCache}s. RedisCacheManager creates
 * its caches in createRedisCache, so overriding that one method is enough.
 */
public class SingleFlightRedisCacheManager extends RedisCacheManager {

    private final StringRedisTemplate redis;
    private final SingleFlightRedisCache.Settings settings;

    /**
     * @param caches the only cache names allowed; asking for any other name fails, so a typo in an
     *               annotation is caught at the first call instead of silently creating a new cache
     */
    public SingleFlightRedisCacheManager(RedisCacheWriter writer, RedisCacheConfiguration defaults,
            Map<String, RedisCacheConfiguration> caches, StringRedisTemplate redis,
            SingleFlightRedisCache.Settings settings) {
        super(writer, defaults, false, caches);
        this.redis = redis;
        this.settings = settings;
    }

    @Override
    protected RedisCache createRedisCache(String name, RedisCacheConfiguration config) {
        return new SingleFlightRedisCache(name, getCacheWriter(),
                config != null ? config : getDefaultCacheConfiguration(), redis, settings);
    }
}
