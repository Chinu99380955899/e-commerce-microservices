package com.auramart.catalog;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/** The whole app starts, and Flyway's migrations match the entity (ddl-auto=validate). */
@SpringBootTest(properties = "spring.datasource.password=unused-by-testcontainers")
@Import(TestcontainersConfiguration.class)
class CatalogServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
