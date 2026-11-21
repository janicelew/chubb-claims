package com.chubb.claims.security;

import com.chubb.claims.common.UnauthorizedException;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/** Lets any controller method take a {@link CurrentUser} parameter. Reads the demo headers. */
@Component
public class CurrentUserResolver implements HandlerMethodArgumentResolver {

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String ROLE_HEADER = "X-User-Role";

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterType().equals(CurrentUser.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest request, WebDataBinderFactory binderFactory) {
        String id = request.getHeader(USER_ID_HEADER);
        String role = request.getHeader(ROLE_HEADER);
        if (id == null || id.isBlank() || role == null || role.isBlank()) {
            throw new UnauthorizedException("Missing " + USER_ID_HEADER + " / " + ROLE_HEADER + " headers");
        }
        try {
            return new CurrentUser(id.trim(), Role.valueOf(role.trim().toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new UnauthorizedException("Unknown role: " + role);
        }
    }
}
