package com.auramart.catalog.service;

import com.auramart.catalog.cache.CacheKeys;
import com.auramart.catalog.dto.ProductResponse;
import com.auramart.catalog.mapper.ProductMapper;
import com.auramart.catalog.repository.ProductRepository;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cache-aside read of one product (step 4.2): look in Redis first; on a miss read the database
 * and store the answer.
 *
 * Why a separate bean: @Cacheable works through a Spring proxy, so a call from inside
 * ProductService to its own method would skip the cache.
 *
 * Why Optional: an empty result is cached too (as "not found", 60 s, step 4.10). Without it, a
 * flood of requests for ids that do not exist would all reach the database.
 */
@Component
@RequiredArgsConstructor
public class ProductLookup {

    private final ProductRepository repository;
    private final ProductMapper mapper;

    /** sync = true: on a miss, one request loads and the others wait for it (step 4.9). */
    @Cacheable(cacheNames = CacheKeys.PRODUCT, key = "#id", sync = true)
    @Transactional(readOnly = true)
    public Optional<ProductResponse> findActive(UUID id) {
        return repository.findByIdAndActiveTrue(id).map(mapper::toResponse);
    }
}
