package com.auramart.catalog.cache;

import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.data.domain.Pageable;

/**
 * Cache names and the keys built for them. One place, so the @Cacheable that writes an entry
 * and the @CacheEvict that removes it can never disagree about the name.
 *
 * In Redis the full key is "catalog:" + cache name + "::" + key, for example
 * catalog:product::3f2a... or catalog:productList::bags|0|20|price,asc
 */
public final class CacheKeys {

    /** One product by id. Also holds "not found" markers for 60 s (step 4.10). */
    public static final String PRODUCT = "product";
    /** One page of the product list (step 4.8). */
    public static final String PRODUCT_LIST = "productList";
    /** One page of search results (step 4.8). */
    public static final String PRODUCT_SEARCH = "productSearch";

    private CacheKeys() {
    }

    /**
     * "bags|0|20|price,asc". The category is lower-cased like the service does, so "Bags" and
     * "bags" share one entry instead of filling the cache with copies of the same page.
     */
    public static String list(String category, Pageable pageable) {
        String cat = (category == null || category.isBlank()) ? "all" : category.toLowerCase(Locale.ROOT);
        return cat + "|" + page(pageable);
    }

    /** Search ignores case (pg_trgm and ILIKE), so "Hedphones" and "hedphones" share one entry. */
    public static String search(String query, Pageable pageable) {
        return query.trim().toLowerCase(Locale.ROOT) + "|" + page(pageable);
    }

    private static String page(Pageable pageable) {
        String sort = pageable.getSort().stream()
                .map(order -> order.getProperty() + "," + order.getDirection().name().toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(";"));
        return pageable.getPageNumber() + "|" + pageable.getPageSize() + "|" + (sort.isEmpty() ? "none" : sort);
    }
}
