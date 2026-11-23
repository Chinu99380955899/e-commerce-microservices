package com.auramart.catalog.repository;

import com.auramart.catalog.domain.Product;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Database access only. Spring Data writes the SQL from the method names.
 */
public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findByIdAndActiveTrue(UUID id);

    boolean existsBySku(String sku);

    Page<Product> findByActiveTrue(Pageable pageable);

    Page<Product> findByActiveTrueAndCategory(String category, Pageable pageable);

    /**
     * Typo-tolerant search on name, brand and category (pg_trgm, V3 and V4 migrations).
     * {@code q <% column} matches when q is close to any word in the column ("hedphones" → "Headphones");
     * {@code ILIKE pattern} catches plain substrings. Best matches come first.
     * Native SQL, because JPQL does not know the pg_trgm operators.
     */
    @Query(value = """
            SELECT * FROM products
            WHERE active = true
              AND (:q <% name OR :q <% brand OR :q <% category
                   OR name ILIKE :pattern OR brand ILIKE :pattern OR category ILIKE :pattern)
            ORDER BY GREATEST(word_similarity(:q, name),
                              word_similarity(:q, coalesce(brand, '')),
                              word_similarity(:q, category)) DESC,
                     name ASC
            """,
            countQuery = """
            SELECT count(*) FROM products
            WHERE active = true
              AND (:q <% name OR :q <% brand OR :q <% category
                   OR name ILIKE :pattern OR brand ILIKE :pattern OR category ILIKE :pattern)
            """,
            nativeQuery = true)
    Page<Product> search(@Param("q") String q, @Param("pattern") String pattern, Pageable pageable);
}
