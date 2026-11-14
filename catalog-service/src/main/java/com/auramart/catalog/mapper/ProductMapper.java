package com.auramart.catalog.mapper;

import com.auramart.catalog.domain.Product;
import com.auramart.catalog.dto.ProductRequest;
import com.auramart.catalog.dto.ProductResponse;
import org.springframework.stereotype.Component;

/**
 * Converts between the database shape (Product) and the API shape (DTOs).
 * Keeping this in one class means the conversion rules live in one place.
 */
@Component
public class ProductMapper {

    public Product toEntity(ProductRequest request) {
        Product product = new Product();
        product.setSku(request.sku());
        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategory(request.category().toLowerCase());
        product.setBrand(request.brand());
        product.setPrice(request.price());
        product.setCurrency(request.currency().toUpperCase());
        product.setStockQuantity(request.stockQuantity());
        return product;
    }

    public ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getDescription(),
                product.getCategory(),
                product.getBrand(),
                product.getPrice(),
                product.getCurrency(),
                product.getStockQuantity(),
                product.getStockQuantity() > 0,
                product.getUpdatedAt());
    }
}
