/**
 * User Types and DTOs
 */
import { UserRole } from "@prisma/client";
export { UserRole };
export interface User {
    id: string;
    email: string;
    name?: string | null;
    password?: string | null;
    avatar?: string | null;
    googleId?: string | null;
    provider?: string | null;
    role: UserRole;
    isVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null;
}
export interface UserResponse {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
    provider?: string | null;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
export interface RegisterRequest {
    email: string;
    password: string;
    name?: string;
}
export interface RegisterResponse {
    success: boolean;
    message: string;
    data: {
        user: UserResponse;
        accessToken: string;
    };
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        user: UserResponse;
        accessToken: string;
    };
}
export interface LogoutResponse {
    success: boolean;
    message: string;
}
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
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
export interface ChangePasswordResponse {
    success: boolean;
    message: string;
}
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
export interface GoogleOAuthUser {
    googleId: string;
    email: string;
    name?: string;
    avatar?: string;
}
export interface GoogleCallbackResponse {
    success: boolean;
    message: string;
    data: {
        user: UserResponse;
        accessToken: string;
    };
}
export interface TokenPayload {
    userId: string;
    email: string;
    role: UserRole;
}
export interface CreateUserData {
    email: string;
    password?: string;
    name?: string;
    googleId?: string;
    provider: string;
    avatar?: string;
    role?: UserRole;
}
export interface UpdateUserData {
    name?: string | null;
    avatar?: string | null;
    password?: string;
    role?: UserRole;
    isActive?: boolean;
}
export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByGoogleId(googleId: string): Promise<User | null>;
    findMany(options?: FindManyOptions): Promise<User[]>;
    count(options?: CountOptions): Promise<number>;
    create(userData: CreateUserData): Promise<User>;
    update(id: string, userData: UpdateUserData): Promise<User>;
    delete(id: string): Promise<void>;
}
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
export interface CountOptions {
    role?: UserRole;
    isActive?: boolean;
}
export interface IUserService {
    register(data: RegisterRequest): Promise<RegisterResponse>;
    login(data: LoginRequest): Promise<LoginResponse>;
    logout(): Promise<LogoutResponse>;
    getProfile(userId: string): Promise<GetProfileResponse>;
    updateProfile(userId: string, data: UpdateProfileRequest): Promise<UpdateProfileResponse>;
    changePassword(userId: string, data: ChangePasswordRequest): Promise<ChangePasswordResponse>;
    handleGoogleOAuth(googleUser: GoogleOAuthUser): Promise<User>;
    hashPassword(password: string): Promise<string>;
    comparePassword(password: string, hash: string): Promise<boolean>;
    generateAccessToken(payload: TokenPayload): string;
    verifyAccessToken(token: string): TokenPayload | null;
    createAdmin(data: CreateAdminRequest): Promise<CreateAdminResponse>;
}
//# sourceMappingURL=index.d.ts.map