package com.auramart.catalog.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.auramart.catalog.domain.Product;
import com.auramart.catalog.dto.PagedResponse;
import com.auramart.catalog.dto.ProductRequest;
import com.auramart.catalog.dto.ProductResponse;
import com.auramart.catalog.mapper.ProductMapper;
import com.auramart.catalog.repository.ProductRepository;
import com.auramart.common.error.BusinessException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
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

    @Test
    void updateChangesEditableFieldsButNeverTheSku() {
        Product stored = sampleProduct("AUD-ANC-100", "bags");
        Instant lastRead = Instant.parse("2026-01-01T10:00:00Z");
        stored.setUpdatedAt(lastRead);
        when(repository.findByIdAndActiveTrue(stored.getId())).thenReturn(Optional.of(stored));

        ProductRequest request = new ProductRequest("CHANGED-SKU", "New name", "New description",
                "HOME", "Brand", new BigDecimal("1499.00"), "usd", 3, lastRead);

        ProductResponse result = service.update(stored.getId(), request);

        assertThat(result.sku()).isEqualTo("AUD-ANC-100");
        assertThat(result.name()).isEqualTo("New name");
        assertThat(result.category()).isEqualTo("home");
        assertThat(result.currency()).isEqualTo("USD");
        assertThat(result.price()).isEqualByComparingTo("1499.00");
        assertThat(result.updatedAt()).isAfter(lastRead);
    }

    @Test
    void updateRefusesWhenTheClientsCopyIsStale() {
        Product stored = sampleProduct("AUD-ANC-100", "bags");
        stored.setUpdatedAt(Instant.parse("2026-01-02T10:00:00Z"));
        when(repository.findByIdAndActiveTrue(stored.getId())).thenReturn(Optional.of(stored));

        ProductRequest staleRequest = new ProductRequest("AUD-ANC-100", "Name", "Desc",
                "bags", null, new BigDecimal("10.00"), "INR", 1,
                Instant.parse("2026-01-01T10:00:00Z"));

        assertThatThrownBy(() -> service.update(stored.getId(), staleRequest))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getSlug())
                        .isEqualTo("concurrent-update"));
    }

    @Test
    void deleteHidesTheProductWithoutRemovingTheRow() {
        Product stored = sampleProduct("AUD-ANC-100", "bags");
        when(repository.findByIdAndActiveTrue(stored.getId())).thenReturn(Optional.of(stored));

        service.delete(stored.getId());

        assertThat(stored.isActive()).isFalse();
        verify(repository, never()).delete(any());
    }

    @Test
    void deleteOfAMissingProductIsNotFound() {
        UUID missing = UUID.randomUUID();
        when(repository.findByIdAndActiveTrue(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(missing))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getSlug())
                        .isEqualTo("product-not-found"));
    }

    @Test
    void createTurnsARacedDuplicateSkuIntoConflict() {
        ProductRequest request = new ProductRequest("AUD-ANC-100", "Name", "Desc",
                "bags", null, new BigDecimal("10.00"), "INR", 1, null);
        when(repository.existsBySku("AUD-ANC-100")).thenReturn(false);
        when(repository.saveAndFlush(any(Product.class))).thenThrow(new DataIntegrityViolationException(
                "could not execute statement",
                new RuntimeException("ERROR: duplicate key value violates unique constraint \"products_sku_key\"")));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> {
                    assertThat(((BusinessException) error).getSlug()).isEqualTo("duplicate-sku");
                    assertThat(((BusinessException) error).getStatus()).isEqualTo(HttpStatus.CONFLICT);
                });
    }

    @Test
    void searchTrimsTheQueryAndEscapesLikeWildcards() {
        Pageable pageable = PageRequest.of(0, 20);
        when(repository.search("50%_off", "%50\\%\\_off%", pageable))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        PagedResponse<?> result = service.search("  50%_off  ", pageable);

        verify(repository).search("50%_off", "%50\\%\\_off%", pageable);
        assertThat(result.content()).isEmpty();
    }

    @Test
    void getActiveOfAMissingProductIsNotFound() {
        UUID missing = UUID.randomUUID();
        when(repository.findByIdAndActiveTrue(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getActive(missing))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getSlug())
                        .isEqualTo("product-not-found"));
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
