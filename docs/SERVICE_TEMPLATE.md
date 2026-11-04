# New Service Checklist

Every backend service is created from this checklist so all services look and behave the same.

## 1. Create the module
- [ ] Folder `<name>-service/` in the repo root
- [ ] `pom.xml` with `auramart-parent` as parent (no versions on Spring dependencies)
- [ ] Add `<module><name>-service</module>` to the root `pom.xml`
- [ ] Package `com.auramart.<name>`

## 2. Baseline dependencies
- [ ] `spring-boot-starter-web`
- [ ] `spring-boot-starter-validation`
- [ ] `spring-boot-starter-actuator`
- [ ] `common-lib`
- [ ] DB driver + `spring-boot-starter-data-jpa` + Flyway (if the service has a database)
- [ ] `spring-boot-starter-test` + Testcontainers (test scope)

## 3. `application.yml` baseline
```yaml
server:
  port: 808X                 # from the README service table
  shutdown: graceful         # finish in-flight requests on deploy

spring:
  application:
    name: <name>-service
  threads:
    virtual:
      enabled: true          # Java 21 virtual threads (SYSTEM_DESIGN §10)
  jpa:
    open-in-view: false      # no lazy loading in controllers
    hibernate:
      ddl-auto: validate     # schema is owned by Flyway, never Hibernate
  flyway:
    enabled: true

management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      probes:
        enabled: true        # /actuator/health/liveness and /readiness
```

## 4. Code conventions
- [ ] Layers: `controller → service → repository`; DTOs in `api/dto`, never return entities
- [ ] Errors are thrown as `BusinessException(slug, status)` and rendered by the `common-lib` ProblemDetail handler
- [ ] Every endpoint matches `frontend/API_CONTRACT.md`
- [ ] Logs use SLF4J with `requestId` in the MDC, never `System.out`

## 5. Quality gates (before the PR)
- [ ] Unit tests (JUnit 5 + Mockito) for the service layer
- [ ] Integration test with Testcontainers for the repository/API
- [ ] Swagger UI works at `/swagger-ui.html`
- [ ] `Dockerfile` (multi-stage, non-root user)
- [ ] Service added to `infra/docker-compose.yml`
- [ ] README service table status updated
