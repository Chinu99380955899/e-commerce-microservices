package com.auramart.catalog.cache;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.cache.RedisCache;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheWriter;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

/**
 * Step 4.9: stampede protection ("single flight").
 *
 * Problem: a popular entry expires, and 500 requests miss it in the same second. Without protection,
 * all 500 run the same database query. With it, one request loads the value; the others wait for it.
 *
 * Spring calls {@link #get(Object, Callable)} for {@code @Cacheable(sync = true)}. On a miss:
 * <ol>
 *   <li>Take a lock for this one key: {@code SET catalog:lock:<cache>::<key> <token> NX PX <lockTtl>}.
 *       NX means "only if absent", so exactly one request in the whole cluster gets it.</li>
 *   <li>The winner loads the value, stores it, then releases the lock (stored BEFORE released, so
 *       anyone who sees the lock gone also sees the value).</li>
 *   <li>The others poll until the lock is gone, then read the cache.</li>
 * </ol>
 *
 * Safety nets: the lock expires by itself after {@code lockTtl} (a crashed pod cannot block a key
 * forever), and after {@code maxWait} a waiter reads the database itself (a slow answer beats an error).
 *
 * Why a subclass and not Spring's built-in sync support: RedisCache's own sync path passes the TTL
 * function a null value, which our TTL rule reads as "not found" (60 s) for every entry. Here the value
 * is stored with {@link #put}, so the TTL function sees it. Being a RedisCache also keeps Spring Boot's
 * cache metrics working.
 */
@Slf4j
public class SingleFlightRedisCache extends RedisCache {

    /**
     * Delete the lock only if it still holds OUR token. If our load took longer than lockTtl, the lock
     * expired and someone else may own it now; a plain DEL would remove their lock.
     */
    private static final RedisScript<Long> UNLOCK = RedisScript.of(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            Long.class);

    private final StringRedisTemplate redis;
    private final Settings settings;

    public SingleFlightRedisCache(String name, RedisCacheWriter writer, RedisCacheConfiguration config,
            StringRedisTemplate redis, Settings settings) {
        super(name, writer, config);
        this.redis = redis;
        this.settings = settings;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T get(Object key, Callable<T> valueLoader) {
        ValueWrapper cached = get(key);   // the counted hit or miss of this request
        if (cached != null) {
            return (T) cached.get();      // null here means a cached "not found"
        }

        String lockKey = lockKey(key);
        long deadline = System.nanoTime() + settings.maxWait().toNanos();
        while (System.nanoTime() - deadline < 0) {
            String token = UUID.randomUUID().toString();
            if (Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(lockKey, token, settings.lockTtl()))) {
                try {
                    // The previous lock holder may have stored the value between our miss and our lock.
                    // hasKey is not counted in the cache statistics, so a normal miss is not counted twice.
                    if (Boolean.TRUE.equals(redis.hasKey(createCacheKey(key)))) {
                        ValueWrapper filled = get(key);
                        if (filled != null) {
                            return (T) filled.get();
                        }
                    }
                    return loadAndStore(key, valueLoader);
                } finally {
                    unlock(lockKey, token);
                }
            }

            // Someone else, maybe on another pod, is loading this key. Wait until they finish.
            if (!waitForUnlock(lockKey, deadline)) {
                break;
            }
            cached = get(key);
            if (cached != null) {
                return (T) cached.get();
            }
            // The holder finished without storing anything (its load failed): try to take the lock ourselves.
        }

        log.warn("Waited {} for cache lock {}, reading the database directly", settings.maxWait(), lockKey);
        return loadAndStore(key, valueLoader);
    }

    /** The lock lives outside the cache's own keys, so clearing a cache never deletes a lock in use. */
    String lockKey(Object key) {
        return CacheKeys.KEY_PREFIX + "lock:" + getName() + "::" + convertKey(key);
    }

    private <T> T loadAndStore(Object key, Callable<T> valueLoader) {
        T value;
        try {
            value = valueLoader.call();
        } catch (Exception ex) {
            // Spring unwraps this and rethrows the original exception to the caller.
            throw new ValueRetrievalException(key, valueLoader, ex);
        }
        try {
            put(key, value);
        } catch (RuntimeException ex) {
            // The value is already loaded, so answer with it. Throwing here would make Spring's error
            // handling call the loader again: a second database query for nothing.
            log.warn("Cache put failed after loading. cache={} key={}: {}", getName(), key, ex.getMessage());
        }
        return value;
    }

    /** True when the lock is gone; false when the deadline passed (or the thread was interrupted). */
    private boolean waitForUnlock(String lockKey, long deadline) {
        while (Boolean.TRUE.equals(redis.hasKey(lockKey))) {
            if (System.nanoTime() - deadline >= 0) {
                return false;
            }
            try {
                Thread.sleep(settings.pollInterval());   // cheap on a virtual thread: it unmounts while sleeping
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return true;
    }

    private void unlock(String lockKey, String token) {
        try {
            redis.execute(UNLOCK, List.of(lockKey), token);
        } catch (RuntimeException ex) {
            // Not fatal: the lock expires by itself after lockTtl.
            log.warn("Releasing cache lock {} failed, it expires within {}: {}",
                    lockKey, settings.lockTtl(), ex.getMessage());
        }
    }

    /**
     * @param lockTtl      how long a crashed loader can block one key; must be longer than a normal load
     * @param maxWait      how long a waiting request waits before reading the database itself
     * @param pollInterval how often a waiting request checks whether the lock is gone
     */
    public record Settings(Duration lockTtl, Duration maxWait, Duration pollInterval) {
    }
}
