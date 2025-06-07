/**
 * User Service Implementation
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  IUserService,
  IUserRepository,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  GoogleOAuthUser,
  User,
  TokenPayload,
  UserResponse,
  GetProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  UserRole,
  CreateAdminRequest,
  CreateAdminResponse,
} from "../../types/users";
import { authConfig } from "../../config/auth";

export class UserService implements IUserService {
  constructor(private userRepository: IUserRepository) {}

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        return {
          success: false,
          message: "User with this email already exists",
          data: {
            user: {} as UserResponse,
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
    } catch (error) {
      throw new Error("Registration failed");
    }
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      // Find user
      const user = await this.userRepository.findByEmail(data.email);
      if (!user || !user.password) {
        return {
          success: false,
          message: "Invalid email or password",
          data: {
            user: {} as UserResponse,
            accessToken: "",
          },
        };
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(
        data.password,
        user.password
      );
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid email or password",
          data: {
            user: {} as UserResponse,
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
    } catch (error) {
      throw new Error("Login failed");
    }
  }

  async logout(): Promise<LogoutResponse> {
    // For JWT-based auth, logout is primarily client-side
    return {
      success: true,
      message: "Logout successful",
    };
  }

  async getProfile(userId: string): Promise<GetProfileResponse> {
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
    } catch (error) {
      throw new Error("Failed to get user profile");
    }
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileRequest
  ): Promise<UpdateProfileResponse> {
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
    } catch (error) {
      throw new Error("Failed to update user profile");
    }
  }

  async changePassword(
    userId: string,
    data: ChangePasswordRequest
  ): Promise<ChangePasswordResponse> {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user || !user.password) {
        return {
          success: false,
          message: "Cannot change password for OAuth users",
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(
        data.currentPassword,
        user.password
      );

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
    } catch (error) {
      throw new Error("Failed to change password");
    }
  }

  async handleGoogleOAuth(googleUser: GoogleOAuthUser): Promise<User> {
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
        } else {
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
    } catch (error) {
      throw new Error("Google OAuth handling failed");
    }
  }

  async createAdmin(data: CreateAdminRequest): Promise<CreateAdminResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        return {
          success: false,
          message: "User with this email already exists",
          data: {
            user: {} as UserResponse,
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
        role: UserRole.ADMIN,
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
    } catch (error) {
      throw new Error("Admin creation failed");
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, authConfig.bcrypt.saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, authConfig.jwt.secret, {
      expiresIn: authConfig.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, authConfig.jwt.secret) as TokenPayload;
    } catch {
      return null;
    }
  }

  private toUserResponse(user: User): UserResponse {
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

// Export a factory function to create service instance
export const createUserService = (
  userRepository: IUserRepository
): IUserService => {
  return new UserService(userRepository);
};
