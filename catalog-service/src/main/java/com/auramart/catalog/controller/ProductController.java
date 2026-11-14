package com.auramart.catalog.controller;

import com.auramart.catalog.dto.PagedResponse;
import com.auramart.catalog.dto.ProductRequest;
import com.auramart.catalog.dto.ProductResponse;
import com.auramart.catalog.service.ProductService;
import com.auramart.common.error.BusinessException;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * HTTP only: read the request, call the service, return the status code.
 * No business rules here.
 */
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    /** The only fields a client may sort by. Anything else is rejected, so no slow arbitrary sorts. */
    private static final Set<String> SORT_FIELDS = Set.of("name", "price", "createdAt");
    private static final int MAX_PAGE_SIZE = 100;

    private final ProductService service;

    @GetMapping
    public PagedResponse<ProductResponse> list(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        if (page < 0) {
            throw invalid("page must be 0 or more");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw invalid("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        return service.list(category, PageRequest.of(page, size, parseSort(sort)));
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        ProductResponse created = service.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/products/" + created.id()))
                .body(created);
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable UUID id) {
        return service.getActive(id);
    }

    /** Turns "price,desc" into a Sort, checking the field and direction first. */
    private static Sort parseSort(String raw) {
        String[] parts = raw.split(",");
        String field = parts[0];
        String direction = parts.length > 1 ? parts[1] : "asc";
        if (!SORT_FIELDS.contains(field) || !(direction.equals("asc") || direction.equals("desc"))) {
            throw invalid("sort must be one of name,asc, price,asc, price,desc, createdAt,desc");
        }
        return direction.equals("desc") ? Sort.by(field).descending() : Sort.by(field).ascending();
    }

    private static BusinessException invalid(String detail) {
        return new BusinessException("validation-error", HttpStatus.BAD_REQUEST, "Validation failed", detail);
    }
}
