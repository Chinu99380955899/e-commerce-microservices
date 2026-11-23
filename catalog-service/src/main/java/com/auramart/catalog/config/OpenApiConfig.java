package com.auramart.catalog.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI at /swagger-ui.html, raw OpenAPI JSON at /v3/api-docs.
 * springdoc reads the controllers, so the docs always match the code.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI catalogOpenApi() {
        return new OpenAPI().info(new Info()
                .title("AuraMart Catalog API")
                .version("v1")
                .description("Products: list, typo-tolerant search, get, create, update, soft delete. "
                        + "Errors use RFC 9457 problem details."));
    }
}
