"use strict";
/**
 * User Service Implementation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserService = exports.UserService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const users_1 = require("../../types/users");
const auth_1 = require("../../config/auth");
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async register(data) {
        try {
            // Check if user already exists
            const existingUser = await this.userRepository.findByEmail(data.email);
            if (existingUser) {
                return {
                    success: false,
                    message: "User with this email already exists",
                    data: {
                        user: {},
                        accessToken: "",
                    },
                };
            }
            // Hash password
            const hashedPassword = await this.hashPassword(data.password);
            // Create user
            const user = await this.userRepository.create({
                email: data.email,
                password: hashedPassword,
                name: data.name,
                provider: "local",
            });
            // Generate access token
            const accessToken = this.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });
            // Convert to response format
            const userResponse = this.toUserResponse(user);
            return {
                success: true,
                message: "User registered successfully",
                data: {
                    user: userResponse,
                    accessToken,
                },
            };
        }
        catch (error) {
            throw new Error("Registration failed");
        }
    }
    async login(data) {
        try {
            // Find user
            const user = await this.userRepository.findByEmail(data.email);
            if (!user || !user.password) {
                return {
                    success: false,
                    message: "Invalid email or password",
                    data: {
                        user: {},
                        accessToken: "",
                    },
                };
            }
            // Verify password
            const isPasswordValid = await this.comparePassword(data.password, user.password);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: "Invalid email or password",
                    data: {
                        user: {},
                        accessToken: "",
                    },
                };
            }
            // Generate access token
            const accessToken = this.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });
            // Convert to response format
            const userResponse = this.toUserResponse(user);
            return {
                success: true,
                message: "Login successful",
                data: {
                    user: userResponse,
                    accessToken,
                },
            };
        }
        catch (error) {
            throw new Error("Login failed");
        }
    }
    async logout() {
        // For JWT-based auth, logout is primarily client-side
        return {
            success: true,
            message: "Logout successful",
        };
    }
    async getProfile(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: "User not found",
                };
            }
            const userResponse = this.toUserResponse(user);
            return {
                success: true,
                data: {
                    user: userResponse,
                },
            };
        }
        catch (error) {
            throw new Error("Failed to get user profile");
        }
    }
    async updateProfile(userId, data) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: "User not found",
                };
            }
            // Update user with provided data
            const updatedUser = await this.userRepository.update(userId, {
                name: data.name !== undefined ? data.name : user.name,
                avatar: data.avatar !== undefined ? data.avatar : user.avatar,
            });
            const userResponse = this.toUserResponse(updatedUser);
            return {
                success: true,
                message: "Profile updated successfully",
                data: {
                    user: userResponse,
                },
            };
        }
        catch (error) {
            throw new Error("Failed to update user profile");
        }
    }
    async changePassword(userId, data) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user || !user.password) {
                return {
                    success: false,
                    message: "Cannot change password for OAuth users",
                };
            }
            // Verify current password
            const isCurrentPasswordValid = await this.comparePassword(data.currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                return {
                    success: false,
                    message: "Current password is incorrect",
                };
            }
            // Hash new password
            const hashedNewPassword = await this.hashPassword(data.newPassword);
            // Update password
            await this.userRepository.update(userId, {
                password: hashedNewPassword,
            });
            return {
                success: true,
                message: "Password changed successfully",
            };
        }
        catch (error) {
            throw new Error("Failed to change password");
        }
    }
    async handleGoogleOAuth(googleUser) {
        try {
            // Check if user exists by Google ID
            let user = await this.userRepository.findByGoogleId(googleUser.googleId);
            if (!user) {
                // Check if user exists by email
                user = await this.userRepository.findByEmail(googleUser.email);
                if (user) {
                    // Update existing user with Google ID
                    user = await this.userRepository.update(user.id, {
                        name: googleUser.name || user.name,
                        avatar: googleUser.avatar || user.avatar,
                    });
                }
                else {
                    // Create new user
                    user = await this.userRepository.create({
                        email: googleUser.email,
                        name: googleUser.name,
                        googleId: googleUser.googleId,
                        provider: "google",
                        avatar: googleUser.avatar,
                    });
                }
            }
            return user;
        }
        catch (error) {
            throw new Error("Google OAuth handling failed");
        }
    }
    async createAdmin(data) {
        try {
            // Check if user already exists
            const existingUser = await this.userRepository.findByEmail(data.email);
            if (existingUser) {
                return {
                    success: false,
                    message: "User with this email already exists",
                    data: {
                        user: {},
                    },
                };
            }
            // Hash password
            const hashedPassword = await this.hashPassword(data.password);
            // Create admin user
            const user = await this.userRepository.create({
                email: data.email,
                password: hashedPassword,
                name: data.name,
                provider: "local",
                role: users_1.UserRole.ADMIN,
            });
            // Convert to response format
            const userResponse = this.toUserResponse(user);
            return {
                success: true,
                message: "Admin user created successfully",
                data: {
                    user: userResponse,
                },
            };
        }
        catch (error) {
            throw new Error("Admin creation failed");
        }
    }
    async hashPassword(password) {
        return bcryptjs_1.default.hash(password, auth_1.authConfig.bcrypt.saltRounds);
    }
    async comparePassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, auth_1.authConfig.jwt.secret, {
            expiresIn: auth_1.authConfig.jwt.expiresIn,
        });
    }
    verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, auth_1.authConfig.jwt.secret);
        }
        catch {
            return null;
        }
    }
    toUserResponse(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            provider: user.provider,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
exports.UserService = UserService;
// Export a factory function to create service instance
const createUserService = (userRepository) => {
    return new UserService(userRepository);
};
exports.createUserService = createUserService;
//# sourceMappingURL=index.js.map