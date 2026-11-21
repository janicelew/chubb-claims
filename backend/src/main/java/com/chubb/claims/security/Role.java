package com.chubb.claims.security;

public enum Role {
    CLAIMANT,
    OFFICER,
    MANAGER;

    public boolean isStaff() {
        return this == OFFICER || this == MANAGER;
    }
}
