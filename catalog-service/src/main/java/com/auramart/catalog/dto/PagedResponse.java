package com.auramart.catalog.dto;

import java.util.List;

/**
 * A page of results in the shape the API contract defines:
 * { content: [...], page: { size, number, totalElements, totalPages } }.
 * The page number is 0-based, as in the contract.
 */
public record PagedResponse<T>(List<T> content, PageInfo page) {

    public record PageInfo(int size, int number, long totalElements, int totalPages) {
    }
}
