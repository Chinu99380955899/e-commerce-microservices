package com.auramart.catalog;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Starts a throwaway PostgreSQL and Redis in Docker for tests. @ServiceConnection points the app's
 * DataSource and Redis client at them, so tests never touch the local compose containers.
 * The same images as infra/docker-compose.yml, so pg_trgm, pgvector and Redis behave like dev.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgres() {
        return new PostgreSQLContainer(DockerImageName.parse("pgvector/pgvector:pg17")
                .asCompatibleSubstituteFor("postgres"));
    }

    @Bean
    @ServiceConnection(name = "redis")
    GenericContainer<?> redis() {
        return new GenericContainer<>(DockerImageName.parse("redis:7.4")).withExposedPorts(6379);
    }
}
