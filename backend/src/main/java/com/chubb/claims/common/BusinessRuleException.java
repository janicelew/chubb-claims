package com.chubb.claims.common;

/** The request breaks a business rule, e.g. incident date outside the policy period (HTTP 422). */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
