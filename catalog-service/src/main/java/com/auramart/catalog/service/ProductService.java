package com.auramart.catalog.service;

import com.auramart.catalog.cache.CacheKeys;
import com.auramart.catalog.domain.Product;
import com.auramart.catalog.dto.PagedResponse;
import com.auramart.catalog.dto.ProductRequest;
import com.auramart.catalog.dto.ProductResponse;
import com.auramart.catalog.mapper.ProductMapper;
import com.auramart.catalog.repository.ProductRepository;
import com.auramart.common.error.BusinessException;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business rules for products. No HTTP here: this layer throws BusinessException,
 * and the global handler in common-lib turns it into the error response.
 */
@Service
@RequiredArgsConstructor
public class ProductService {

    /** Postgres names the unique constraint on products.sku this way (V1 migration: sku UNIQUE). */
    private static final String SKU_UNIQUE_CONSTRAINT = "products_sku_key";

    private final ProductRepository repository;
    private final ProductMapper mapper;
    private final ProductLookup lookup;

    /**
     * A new product can appear on any list or search page, so all cached pages are dropped.
     * Clearing every page on each write is simple and always correct; it only hurts the hit rate
     * if products are written very often, which a catalogue is not.
     */
    @CacheEvict(cacheNames = {CacheKeys.PRODUCT_LIST, CacheKeys.PRODUCT_SEARCH}, allEntries = true)
    @Transactional
    public ProductResponse create(ProductRequest request) {
        if (repository.existsBySku(request.sku())) {
            throw new BusinessException("duplicate-sku", HttpStatus.CONFLICT, "Duplicate SKU",
                    "A product with SKU " + request.sku() + " already exists");
        }
        Product product = mapper.toEntity(request);
        Instant now = Instant.now();
        product.setId(UUID.randomUUID());
        product.setCreatedAt(now);
        product.setUpdatedAt(now);
        try {
            // Flush now, so a duplicate SKU that slips past existsBySku surfaces here as a 409.
            return mapper.toResponse(repository.saveAndFlush(product));
        } catch (DataIntegrityViolationException ex) {
            if (ex.getMostSpecificCause().getMessage() != null
                    && ex.getMostSpecificCause().getMessage().contains(SKU_UNIQUE_CONSTRAINT)) {
                throw new BusinessException("duplicate-sku", HttpStatus.CONFLICT, "Duplicate SKU",
                        "A product with SKU " + request.sku() + " already exists");
            }
            throw ex;
        }
    }

    /**
     * Updates an active product. If the client sent expectedUpdatedAt and the product changed since,
     * the update is refused. The version check in the database is a second safety net.
     * On success the cached product and every cached page are evicted (after the commit).
     */
    @Caching(evict = {
            @CacheEvict(cacheNames = CacheKeys.PRODUCT, key = "#id"),
            @CacheEvict(cacheNames = {CacheKeys.PRODUCT_LIST, CacheKeys.PRODUCT_SEARCH}, allEntries = true)})
    @Transactional
    public ProductResponse update(UUID id, ProductRequest request) {
        Product product = repository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> productNotFound(id));

        if (request.expectedUpdatedAt() != null
                && !request.expectedUpdatedAt().equals(product.getUpdatedAt())) {
            throw concurrentUpdate();
        }

        mapper.applyUpdate(request, product);
        product.setUpdatedAt(Instant.now());
        // No explicit save: the product is managed by JPA, so changes are written at commit.
        return mapper.toResponse(product);
    }

    /** Soft delete: the product is hidden from lists and lookups, but the row is kept. */
    @Caching(evict = {
            @CacheEvict(cacheNames = CacheKeys.PRODUCT, key = "#id"),
            @CacheEvict(cacheNames = {CacheKeys.PRODUCT_LIST, CacheKeys.PRODUCT_SEARCH}, allEntries = true)})
    @Transactional
    public void delete(UUID id) {
        Product product = repository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> productNotFound(id));
        product.setActive(false);
        product.setUpdatedAt(Instant.now());
    }

    /** No @Transactional here: on a cache hit no database connection is needed at all. */
    public ProductResponse getActive(UUID id) {
        return lookup.findActive(id).orElseThrow(() -> productNotFound(id));
    }

    private static BusinessException productNotFound(UUID id) {
        return new BusinessException("product-not-found", HttpStatus.NOT_FOUND,
                "Product not found", "Product " + id + " not found");
    }

    private static BusinessException concurrentUpdate() {
        return new BusinessException("concurrent-update", HttpStatus.CONFLICT,
                "Concurrent update",
                "This product was changed by someone else. Reload to see the latest version.");
    }

    /**
     * One page of active products, optionally filtered by category.
     * The category is normalised the same way it is stored (lower case).
     */
    @Cacheable(cacheNames = CacheKeys.PRODUCT_LIST, sync = true,
            key = "T(com.auramart.catalog.cache.CacheKeys).list(#category, #pageable)")
    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> list(String category, Pageable pageable) {
        Page<Product> page = (category == null || category.isBlank())
                ? repository.findByActiveTrue(pageable)
                : repository.findByActiveTrueAndCategory(category.toLowerCase(), pageable);
        return toPagedResponse(page);
    }

    /**
     * Typo-tolerant name search, best match first. The query must already be checked as not blank.
     * LIKE wildcards typed by the user (% and _) are escaped, so "%" cannot match every product.
     */
    @Cacheable(cacheNames = CacheKeys.PRODUCT_SEARCH, sync = true,
            key = "T(com.auramart.catalog.cache.CacheKeys).search(#query, #pageable)")
    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> search(String query, Pageable pageable) {
        String q = query.trim();
        String pattern = "%" + escapeLike(q) + "%";
        return toPagedResponse(repository.search(q, pattern, pageable));
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private PagedResponse<ProductResponse> toPagedResponse(Page<Product> page) {
        return new PagedResponse<>(
                page.map(mapper::toResponse).getContent(),
                new PagedResponse.PageInfo(
                        page.getSize(),
                        page.getNumber(),
                        page.getTotalElements(),
                        page.getTotalPages()));
    }
}
