package com.auramart.common.error;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Turns exceptions into RFC 9457 problem responses, the same shape in every service.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    static final String PROBLEM_BASE = "https://auramart.dev/problems/";

    @ExceptionHandler(BusinessException.class)
    public ProblemDetail handleBusiness(BusinessException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
        problem.setType(URI.create(PROBLEM_BASE + ex.getSlug()));
        problem.setTitle(ex.getTitle());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.putIfAbsent(error.getField(), error.getDefaultMessage()));

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "One or more fields are invalid.");
        problem.setType(URI.create(PROBLEM_BASE + "validation-error"));
        problem.setTitle("Validation failed");
        problem.setProperty("errors", errors);
        return problem;
    }

    /**
     * Two saves raced on the same row: the @Version check in the database rejected the older one.
     * This is the same conflict as a stale expectedUpdatedAt, so the client gets the same answer.
     */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ProblemDetail handleOptimisticLock(OptimisticLockingFailureException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "This product was changed by someone else. Reload to see the latest version.");
        problem.setType(URI.create(PROBLEM_BASE + "concurrent-update"));
        problem.setTitle("Concurrent update");
        return problem;
    }

    /**
     * A path or query value that cannot be converted, such as "not-a-uuid" for a UUID id.
     * Without this handler Spring answers 400 in its own format, not ours.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String expected = ex.getRequiredType() == null ? "a valid value" : ex.getRequiredType().getSimpleName();
        Map<String, String> errors = Map.of(ex.getName(), "must be a valid " + expected);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "One or more fields are invalid.");
        problem.setType(URI.create(PROBLEM_BASE + "validation-error"));
        problem.setTitle("Validation failed");
        problem.setProperty("errors", errors);
        return problem;
    }
}
