"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordValidation = exports.updateProfileValidation = exports.refreshTokenValidation = exports.loginValidation = exports.registerValidation = void 0;
const express_validator_1 = require("express-validator");
exports.registerValidation = [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/)
        .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
    (0, express_validator_1.body)("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Name must be between 2 and 50 characters"),
];
exports.loginValidation = [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),
    (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"),
];
exports.refreshTokenValidation = [
    (0, express_validator_1.body)("refreshToken").notEmpty().withMessage("Refresh token is required"),
];
/**
 * Profile update validation for user-facing profile updates
 * Note: This validation is for user profile updates via /users/profile endpoint.
 * Admin-only fields like 'role' and 'isActive' are validated separately in admin routes.
 * The UpdateUserData type includes these fields for repository flexibility,
 * but user profile updates should only allow name and avatar changes.
 */
exports.updateProfileValidation = [
    (0, express_validator_1.body)("name")
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Name must be between 1 and 50 characters when provided"),
    (0, express_validator_1.body)("avatar").optional().isURL().withMessage("Avatar must be a valid URL"),
];
exports.changePasswordValidation = [
    (0, express_validator_1.body)("currentPassword")
        .notEmpty()
        .withMessage("Current password is required"),
    (0, express_validator_1.body)("newPassword")
        .isLength({ min: 8 })
        .withMessage("New password must be at least 8 characters long")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/)
        .withMessage("New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
];
//# sourceMappingURL=validation.js.map