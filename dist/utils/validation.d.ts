export declare const registerValidation: import("express-validator").ValidationChain[];
export declare const loginValidation: import("express-validator").ValidationChain[];
export declare const refreshTokenValidation: import("express-validator").ValidationChain[];
/**
 * Profile update validation for user-facing profile updates
 * Note: This validation is for user profile updates via /users/profile endpoint.
 * Admin-only fields like 'role' and 'isActive' are validated separately in admin routes.
 * The UpdateUserData type includes these fields for repository flexibility,
 * but user profile updates should only allow name and avatar changes.
 */
export declare const updateProfileValidation: import("express-validator").ValidationChain[];
export declare const changePasswordValidation: import("express-validator").ValidationChain[];
//# sourceMappingURL=validation.d.ts.map