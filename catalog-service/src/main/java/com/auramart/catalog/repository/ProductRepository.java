package com.auramart.catalog.repository;

import com.auramart.catalog.domain.Product;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Database access only. Spring Data writes the SQL from the method names.
 */
public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findByIdAndActiveTrue(UUID id);

    boolean existsBySku(String sku);

    Page<Product> findByActiveTrue(Pageable pageable);

    Page<Product> findByActiveTrueAndCategory(String category, Pageable pageable);
}
