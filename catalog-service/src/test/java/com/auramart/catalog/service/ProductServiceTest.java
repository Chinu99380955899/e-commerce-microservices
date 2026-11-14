package com.auramart.catalog.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.auramart.catalog.domain.Product;
import com.auramart.catalog.dto.PagedResponse;
import com.auramart.catalog.mapper.ProductMapper;
import com.auramart.catalog.repository.ProductRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository repository;

    private ProductService service;

    @BeforeEach
    void setUp() {
        // The mapper has no dependencies, so a real one is simpler than a mock.
        service = new ProductService(repository, new ProductMapper());
    }

    @Test
    void listReturnsOnePageWithTheRightTotals() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("name").ascending());
        Product product = sampleProduct("AUD-ANC-100", "bags");
        when(repository.findByActiveTrue(pageable))
                .thenReturn(new PageImpl<>(List.of(product), pageable, 40));

        PagedResponse<?> result = service.list(null, pageable);

        assertThat(result.content()).hasSize(1);
        assertThat(result.page().number()).isZero();
        assertThat(result.page().size()).isEqualTo(20);
        assertThat(result.page().totalElements()).isEqualTo(40);
        assertThat(result.page().totalPages()).isEqualTo(2);
    }

    @Test
    void listFiltersByCategoryAndNormalisesItToLowerCase() {
        Pageable pageable = PageRequest.of(0, 20);
        when(repository.findByActiveTrueAndCategory("bags", pageable))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        PagedResponse<?> result = service.list("BAGS", pageable);

        verify(repository).findByActiveTrueAndCategory("bags", pageable);
        assertThat(result.content()).isEmpty();
        assertThat(result.page().totalElements()).isZero();
    }

    private static Product sampleProduct(String sku, String category) {
        Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setSku(sku);
        product.setName("Test product");
        product.setDescription("A product used in tests");
        product.setCategory(category);
        product.setPrice(new BigDecimal("999.00"));
        product.setCurrency("INR");
        product.setStockQuantity(5);
        product.setActive(true);
        return product;
    }
}
