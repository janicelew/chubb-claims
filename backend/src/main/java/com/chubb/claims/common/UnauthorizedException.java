package com.chubb.claims.common;

/** We don't know who the caller is (HTTP 401). */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
