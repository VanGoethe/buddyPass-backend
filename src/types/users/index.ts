/**
 * User Types and DTOs
 */

import { AuthProvider, UserRole } from "@prisma/client";

export { AuthProvider, UserRole };

// Base User interface
export interface User {
  id: string;
  email: string;
  name?: string | null;
  password?: string | null;
  avatar?: string | null;
  googleId?: string | null;
  provider?: AuthProvider | null;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}

// User without sensitive data (for responses)
export interface UserResponse {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  provider?: AuthProvider | null;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Registration DTOs
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthSession {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: AuthSession;
}

// Login DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: AuthSession;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

// Profile DTOs
export interface GetProfileResponse {
  success: boolean;
  message?: string;
  data?: {
    user: UserResponse;
  };
}

export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data?: {
    user: UserResponse;
  };
}

// Change Password DTOs
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

// Admin User Creation DTOs
export interface CreateAdminRequest {
  email: string;
  password: string;
  name: string;
}

export interface CreateAdminResponse {
  success: boolean;
  message: string;
  data: {
    user: UserResponse;
  };
}

// Google OAuth DTOs
export interface GoogleProfile {
  googleId: string;
  email: string;
  name?: string;
  avatar?: string;
  emailVerified: boolean;
}

/** @deprecated Use GoogleProfile */
export type GoogleOAuthUser = GoogleProfile;

export interface GoogleCallbackResponse {
  success: boolean;
  message: string;
  data: {
    user: UserResponse;
    accessToken: string;
  };
}

// JWT Token Payload
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// User creation data for repository
export interface CreateUserData {
  email: string;
  password?: string;
  name?: string;
  googleId?: string;
  provider: AuthProvider;
  avatar?: string;
  role?: UserRole;
  isVerified?: boolean;
}

export interface UpdateProfileData {
  name?: string | null;
  avatar?: string | null;
  password?: string;
  googleId?: string | null;
  provider?: AuthProvider;
  isVerified?: boolean;
  lastLoginAt?: Date | null;
}

export type UpdateUserData = UpdateProfileData;

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findMany(options?: FindManyOptions): Promise<User[]>;
  count(options?: CountOptions): Promise<number>;
  create(userData: CreateUserData): Promise<User>;
  updateProfile(id: string, userData: UpdateProfileData): Promise<User>;
  updateRole(id: string, role: UserRole): Promise<User>;
  updateStatus(id: string, isActive: boolean): Promise<User>;
  delete(id: string): Promise<void>;
}

// Options for findMany method
export interface FindManyOptions {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  orderBy?: {
    field: "createdAt" | "updatedAt" | "lastLoginAt" | "name" | "email";
    direction: "asc" | "desc";
  };
}

// Options for count method
export interface CountOptions {
  role?: UserRole;
  isActive?: boolean;
}

// Service interfaces
export interface IUserService {
  register(data: RegisterRequest): Promise<AuthSession>;
  login(data: LoginRequest): Promise<AuthSession>;
  refresh(refreshToken: string): Promise<AuthSession>;
  logout(refreshToken: string): Promise<void>;
  getProfile(userId: string): Promise<UserResponse>;
  updateProfile(
    userId: string,
    data: UpdateProfileRequest
  ): Promise<UserResponse>;
  changePassword(userId: string, data: ChangePasswordRequest): Promise<void>;
  handleGoogleOAuth(googleUser: GoogleProfile): Promise<User>;
  issueSession(user: User): Promise<AuthSession>;
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
  generateAccessToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload | null;
  createAdmin(data: CreateAdminRequest): Promise<UserResponse>;
}
