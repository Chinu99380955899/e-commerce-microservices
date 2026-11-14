package com.auramart.catalog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Scan the shared common-lib package too, so its error handler and request-id filter are registered.
@SpringBootApplication(scanBasePackages = {"com.auramart.catalog", "com.auramart.common"})
public class CatalogServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(CatalogServiceApplication.class, args);
	}

}
