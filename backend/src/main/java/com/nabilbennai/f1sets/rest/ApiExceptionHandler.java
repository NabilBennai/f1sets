package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.miscellaneous.ConflictException;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import com.nabilbennai.f1sets.miscellaneous.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(NotFoundException.class)
  public ResponseEntity<ApiErrorResponse> handleNotFound(
      NotFoundException exception, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.RESOURCE_NOT_FOUND,
        exception.getMessage(),
        request.getRequestURI());
  }

  @ExceptionHandler(UnauthorizedException.class)
  public ResponseEntity<ApiErrorResponse> handleUnauthorized(
      UnauthorizedException exception, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.UNAUTHORIZED,
        exception.getMessage(),
        request.getRequestURI());
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiErrorResponse> handleForbidden(
      AccessDeniedException exception, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, "Access is denied", request.getRequestURI());
  }

  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<ApiErrorResponse> handleConflict(
      ConflictException exception, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.CONFLICT,
        ApiErrorCode.CONFLICT,
        exception.getMessage(),
        request.getRequestURI());
  }

  @ExceptionHandler({
    ConstraintViolationException.class,
    MethodArgumentNotValidException.class,
    IllegalArgumentException.class
  })
  public ResponseEntity<ApiErrorResponse> handleBadRequest(
      Exception exception, HttpServletRequest request) {
    String message = exception.getMessage();

    if (exception instanceof ConstraintViolationException constraintViolationException) {
      message =
          constraintViolationException.getConstraintViolations().stream()
              .map(violation -> violation.getMessage())
              .collect(Collectors.joining(", "));
    } else if (exception
        instanceof MethodArgumentNotValidException methodArgumentNotValidException) {
      message =
          methodArgumentNotValidException.getBindingResult().getFieldErrors().stream()
              .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
              .collect(Collectors.joining(", "));
    }

    return buildResponse(
        HttpStatus.BAD_REQUEST, ApiErrorCode.VALIDATION_ERROR, message, request.getRequestURI());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleUnexpected(
      Exception exception, HttpServletRequest request) {
    return buildResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        "Unexpected server error",
        request.getRequestURI());
  }

  private ResponseEntity<ApiErrorResponse> buildResponse(
      HttpStatus status, ApiErrorCode code, String message, String path) {
    ApiErrorResponse body =
        new ApiErrorResponse(Instant.now(), status.value(), code.name(), message, path);
    return ResponseEntity.status(status).body(body);
  }
}
