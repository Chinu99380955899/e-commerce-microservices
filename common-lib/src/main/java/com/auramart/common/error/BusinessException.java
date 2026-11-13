package com.auramart.common.error;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * An expected failure in business logic, such as "product not found".
 *
 * The slug becomes the last part of the problem type URI, for example
 * {@code product-not-found}. Clients check the slug in code, so it must stay stable.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final String slug;
    private final HttpStatus status;
    private final String title;

    public BusinessException(String slug, HttpStatus status, String title, String detail) {
        super(detail);
        this.slug = slug;
        this.status = status;
        this.title = title;
    }
}
