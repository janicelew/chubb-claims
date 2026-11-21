package com.chubb.claims.security;

import com.chubb.claims.common.ForbiddenException;

/**
 * Who is making the request.
 *
 * DELIBERATE SHORTCUT: identity comes from two HTTP headers (X-User-Id, X-User-Role)
 * instead of a real login. Real authentication (e.g. OAuth2/JWT from Chubb's identity
 * provider) would replace {@link CurrentUserResolver} only; everything that uses
 * CurrentUser stays the same. See docs/DECISIONS.md.
 */
public record CurrentUser(String id, Role role) {

    public void requireStaff() {
        if (!role.isStaff()) {
            throw new ForbiddenException("Only claims staff can do this");
        }
    }

    public void requireManager() {
        if (role != Role.MANAGER) {
            throw new ForbiddenException("Only managers can do this");
        }
    }

    public void requireClaimant() {
        if (role != Role.CLAIMANT) {
            throw new ForbiddenException("Only claimants can do this");
        }
    }
}
