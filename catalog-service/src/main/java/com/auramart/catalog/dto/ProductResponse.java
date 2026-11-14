package com.auramart.catalog.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * What the client receives. It leaves out internal fields such as version and active.
 */
public record ProductResponse(
        UUID id,
        String sku,
        String name,
        String description,
        String category,
        String brand,
        BigDecimal price,
        String currency,
        int stockQuantity,
        boolean inStock,
        Instant updatedAt
) {
}
