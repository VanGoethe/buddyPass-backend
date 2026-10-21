import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  IUserService,
  IUserRepository,
  RegisterRequest,
  LoginRequest,
  GoogleProfile,
  User,
  TokenPayload,
  UserResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  UserRole,
  CreateAdminRequest,
  AuthSession,
} from "../../types/users";
import {
  accessTokenSignOptions,
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
  authConfig,
} from "../../config/auth";
import { env } from "../../config/env";
import { durationToMs } from "../../utils/duration";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../utils/errors";
import {
  generateRefreshToken,
  hashRefreshToken,
  PrismaRefreshTokenRepository,
} from "../../repositories/users/refreshTokens";
import { PrismaClient } from "@prisma/client";

export class UserService implements IUserService {
  private refreshTokens: PrismaRefreshTokenRepository;

  constructor(
    private userRepository: IUserRepository,
    prisma: PrismaClient
  ) {
    this.refreshTokens = new PrismaRefreshTokenRepository(prisma);
  }

  async register(data: RegisterRequest): Promise<AuthSession> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError(
        "User with this email already exists",
        "EMAIL_EXISTS"
      );
    }

    const user = await this.userRepository.create({
      email: data.email,
      password: await this.hashPassword(data.password),
      name: data.name,
      provider: "local",
    });

    return this.issueSession(user);
  }

  async login(data: LoginRequest): Promise<AuthSession> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user || !user.password) {
      throw new UnauthorizedError(
        "Invalid email or password",
        "INVALID_CREDENTIALS"
      );
    }

    const isPasswordValid = await this.comparePassword(
      data.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new UnauthorizedError(
        "Invalid email or password",
        "INVALID_CREDENTIALS"
      );
    }

    if (!user.isActive) {
      throw new ForbiddenError(
        "User account is deactivated",
        "USER_INACTIVE"
      );
    }

    const updated = await this.userRepository.updateProfile(user.id, {
      lastLoginAt: new Date(),
    });
    return this.issueSession(updated);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const existing = await this.refreshTokens.findByHash(
      hashRefreshToken(refreshToken)
    );
    if (!existing) {
      throw new UnauthorizedError(
        "Refresh token is invalid",
        "INVALID_REFRESH_TOKEN"
      );
    }

    if (existing.revokedAt) {
      await this.refreshTokens.revokeFamily(existing.familyId);
      throw new UnauthorizedError(
        "Refresh token reuse detected",
        "REFRESH_TOKEN_REUSE"
      );
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError(
        "Refresh token is expired",
        "REFRESH_TOKEN_EXPIRED"
      );
    }

    const user = await this.userRepository.findById(existing.userId);
    if (!user || !user.isActive) {
      throw new ForbiddenError("User account is deactivated", "USER_INACTIVE");
    }

    await this.refreshTokens.revoke(existing.id);
    const session = await this.issueSession(user, existing.familyId);
    return session;
  }

  async logout(refreshToken: string): Promise<void> {
    const existing = await this.refreshTokens.findByHash(
      hashRefreshToken(refreshToken)
    );
    if (existing && !existing.revokedAt) {
      await this.refreshTokens.revoke(existing.id);
    }
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }
    return this.toUserResponse(user);
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileRequest
  ): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    const updatedUser = await this.userRepository.updateProfile(userId, {
      name: data.name !== undefined ? data.name : user.name,
      avatar: data.avatar !== undefined ? data.avatar : user.avatar,
    });
    return this.toUserResponse(updatedUser);
  }

  async changePassword(
    userId: string,
    data: ChangePasswordRequest
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.password) {
      throw new ValidationError("Cannot change password for OAuth users");
    }

    const isCurrentPasswordValid = await this.comparePassword(
      data.currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError(
        "Current password is incorrect",
        "INVALID_CREDENTIALS"
      );
    }

    await this.userRepository.updateProfile(userId, {
      password: await this.hashPassword(data.newPassword),
    });
  }

  async handleGoogleOAuth(profile: GoogleProfile): Promise<User> {
    const byGoogleId = await this.userRepository.findByGoogleId(profile.googleId);
    if (byGoogleId) {
      if (!byGoogleId.isActive) {
        throw new ForbiddenError("User account is deactivated", "USER_INACTIVE");
      }
      return this.userRepository.updateProfile(byGoogleId.id, {
        name: profile.name || byGoogleId.name,
        avatar: profile.avatar || byGoogleId.avatar,
        lastLoginAt: new Date(),
      });
    }

    const byEmail = await this.userRepository.findByEmail(profile.email);
    if (byEmail) {
      if (!byEmail.isVerified) {
        throw new ConflictError(
          "An account with this email exists but is not verified. Log in and link Google from settings.",
          "GOOGLE_LINK_UNVERIFIED"
        );
      }
      if (!byEmail.isActive) {
        throw new ForbiddenError("User account is deactivated", "USER_INACTIVE");
      }
      return this.userRepository.updateProfile(byEmail.id, {
        googleId: profile.googleId,
        name: profile.name || byEmail.name,
        avatar: profile.avatar || byEmail.avatar,
        lastLoginAt: new Date(),
      });
    }

    return this.userRepository.create({
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
      provider: "google",
      avatar: profile.avatar,
      isVerified: true,
    });
  }

  async createAdmin(data: CreateAdminRequest): Promise<UserResponse> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError(
        "User with this email already exists",
        "EMAIL_EXISTS"
      );
    }

    const user = await this.userRepository.create({
      email: data.email,
      password: await this.hashPassword(data.password),
      name: data.name,
      provider: "local",
      role: UserRole.ADMIN,
      isVerified: true,
    });
    return this.toUserResponse(user);
  }

  async issueSession(user: User, familyId?: string): Promise<AuthSession> {
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken();
    await this.refreshTokens.create({
      tokenHash: hashRefreshToken(refreshToken),
      familyId: familyId ?? this.refreshTokens.newFamilyId(),
      userId: user.id,
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    });

    return {
      user: this.toUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, authConfig.bcrypt.saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, authConfig.jwt.secret, accessTokenSignOptions);
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, authConfig.jwt.secret, {
        algorithms: ["HS256"],
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      }) as TokenPayload;
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
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const createUserService = (
  userRepository: IUserRepository,
  prisma: PrismaClient
): IUserService => {
  return new UserService(userRepository, prisma);
};
