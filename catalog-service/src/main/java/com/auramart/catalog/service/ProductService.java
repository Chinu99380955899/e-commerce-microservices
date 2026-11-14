package com.auramart.catalog.service;

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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    private final ProductRepository repository;
    private final ProductMapper mapper;

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
        return mapper.toResponse(repository.save(product));
    }

    @Transactional(readOnly = true)
    public ProductResponse getActive(UUID id) {
        Product product = repository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new BusinessException("product-not-found", HttpStatus.NOT_FOUND,
                        "Product not found", "Product " + id + " not found"));
        return mapper.toResponse(product);
    }

    /**
     * One page of active products, optionally filtered by category.
     * The category is normalised the same way it is stored (lower case).
     */
    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> list(String category, Pageable pageable) {
        Page<Product> page = (category == null || category.isBlank())
                ? repository.findByActiveTrue(pageable)
                : repository.findByActiveTrueAndCategory(category.toLowerCase(), pageable);

        return new PagedResponse<>(
                page.map(mapper::toResponse).getContent(),
                new PagedResponse.PageInfo(
                        page.getSize(),
                        page.getNumber(),
                        page.getTotalElements(),
                        page.getTotalPages()));
    }
}
