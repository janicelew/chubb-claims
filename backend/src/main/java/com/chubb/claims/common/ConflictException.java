package com.chubb.claims.common;

/** The request is valid, but not allowed in the claim's current state (HTTP 409). */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
