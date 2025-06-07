"use strict";
/**
 * User Models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserEntity = void 0;
// User entity class (optional, for business logic)
class UserEntity {
    constructor(id, email, name = null, avatar = null, googleId = null, provider = null, createdAt = new Date(), updatedAt = new Date()) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.avatar = avatar;
        this.googleId = googleId;
        this.provider = provider;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    // Convert to response format (without sensitive data)
    toResponse() {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            avatar: this.avatar,
            provider: this.provider,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
    // Check if user is OAuth user
    isOAuthUser() {
        return this.provider === "google" && !!this.googleId;
    }
    // Check if user is local user
    isLocalUser() {
        return this.provider === "local";
    }
}
exports.UserEntity = UserEntity;
//# sourceMappingURL=index.js.map