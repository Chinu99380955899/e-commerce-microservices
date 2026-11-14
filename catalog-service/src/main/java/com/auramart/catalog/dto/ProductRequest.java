package com.auramart.catalog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * What the client sends to create or update a product.
 * The rules here match the messages in API_CONTRACT.md.
 */
public record ProductRequest(
        @NotBlank @Size(max = 64) @Pattern(regexp = "^[A-Z0-9-]+$") String sku,
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Size(max = 4000) String description,
        @NotBlank @Size(max = 80) String category,
        @Size(max = 80) String brand,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal price,
        @NotBlank @Pattern(regexp = "^[A-Za-z]{3}$") String currency,
        @NotNull @Min(0) Integer stockQuantity
) {
}
