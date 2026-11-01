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
  UpdateProfileData,
  ChangePasswordRequest,
  UserRole,
  CreateAdminRequest,
  AuthSession,
  RegisterResult,
} from "../../types/users";
import {
  accessTokenSignOptions,
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
  authConfig,
} from "../../config/auth";
import { durationToMs } from "../../utils/duration";
import {
  ConflictError,
  ForbiddenError,
  MailUnavailableError,
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
import { IMailer, SmtpMailer } from "../mail/smtpMailer";
import { ICountryRepository } from "../../types/countries";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";
import {
  PrismaAuthTokenRepository,
  RESET_PASSWORD_TTL_MS,
  VERIFY_EMAIL_TTL_MS,
} from "../../repositories/users/authTokens";
import {
  assertMetadata,
  assertTimezone,
  isProfileComplete,
  normalizePhone,
} from "./profile";

export const PASSWORD_RESET_MESSAGE = "If that account exists, a reset link was sent.";

export class UserService implements IUserService {
  private refreshTokens: PrismaRefreshTokenRepository;
  private authTokens: PrismaAuthTokenRepository;

  constructor(
    private userRepository: IUserRepository,
    prisma: PrismaClient,
    private mailer: IMailer = new SmtpMailer(),
    private countries?: ICountryRepository
  ) {
    this.refreshTokens = new PrismaRefreshTokenRepository(prisma);
    this.authTokens = new PrismaAuthTokenRepository(prisma);
  }

  async register(data: RegisterRequest): Promise<RegisterResult> {
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

    const verificationEmailSent = await this.deliverAuthEmail(
      user.id,
      user.email,
      "VERIFY_EMAIL",
      VERIFY_EMAIL_TTL_MS,
      "Verify your BuddyPass email",
      "This link expires in 24 hours."
    );
    const session = await this.issueSession(user);
    return { ...session, verificationEmailSent };
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
    if (Object.values(data).every((value) => value === undefined)) {
      throw new ValidationError("At least one profile field is required");
    }

    const patch: UpdateProfileData = {
      name: data.name !== undefined ? data.name : user.name,
      avatar: data.avatar !== undefined ? data.avatar : user.avatar,
    };
    if (data.phone !== undefined) {
      patch.phone = normalizePhone(data.phone);
    }
    if (data.countryId !== undefined) {
      if (data.countryId !== null) {
        await this.requireActiveCountry(data.countryId);
        patch.countryId = data.countryId;
      } else if (user.countryId) {
        patch.countryId = null;
      }
    }
    if (data.timezone !== undefined) {
      patch.timezone = data.timezone === null ? null : assertTimezone(data.timezone);
    }
    if (data.age !== undefined) {
      patch.age = data.age;
    }
    if (data.heardAboutUs !== undefined) {
      patch.heardAboutUs = data.heardAboutUs;
    }
    if (data.metadata !== undefined) {
      patch.metadata = data.metadata === null ? null : assertMetadata(data.metadata);
    }
    const updatedUser = await this.userRepository.updateProfile(userId, patch);
    return this.toUserResponse(updatedUser);
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.requireUser(userId);
    if (user.isVerified) {
      throw new ConflictError("Email is already verified", "ALREADY_VERIFIED");
    }
    if (!user.password) {
      throw new ConflictError("This account does not use a password", "NOT_LOCAL_ACCOUNT");
    }
    const sent = await this.deliverAuthEmail(
      user.id,
      user.email,
      "VERIFY_EMAIL",
      VERIFY_EMAIL_TTL_MS,
      "Verify your BuddyPass email",
      "This link expires in 24 hours."
    );
    if (!sent) {
      throw new MailUnavailableError();
    }
  }

  async verifyEmail(token: string): Promise<UserResponse> {
    const userId = await this.authTokens.consume(token, "VERIFY_EMAIL");
    const user = await this.userRepository.updateProfile(userId, { isVerified: true });
    return this.toUserResponse(user);
  }

  async forgotPassword(email: string): Promise<void> {
    if (!this.mailer.isConfigured()) {
      throw new MailUnavailableError();
    }
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.isActive || !user.password) {
      return;
    }
    await this.deliverAuthEmail(
      user.id,
      user.email,
      "RESET_PASSWORD",
      RESET_PASSWORD_TTL_MS,
      "Reset your BuddyPass password",
      "This link expires in 1 hour.\n\nIf you did not ask for this, ignore this email."
    );
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await this.authTokens.consume(token, "RESET_PASSWORD");
    await this.userRepository.updateProfile(userId, {
      password: await this.hashPassword(password),
    });
    await this.refreshTokens.revokeAllForUser(userId);
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

  private async requireUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  private async requireActiveCountry(countryId: string): Promise<void> {
    if (!this.countries) {
      throw new ValidationError("Country is not available", undefined, "INVALID_COUNTRY");
    }
    const country = await this.countries.findById(countryId);
    if (!country || !country.isActive) {
      throw new ValidationError("Country is not available", undefined, "INVALID_COUNTRY");
    }
  }

  private async deliverAuthEmail(
    userId: string,
    email: string,
    purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
    ttlMs: number,
    subject: string,
    expiryLine: string
  ): Promise<boolean> {
    try {
      const token = await this.authTokens.issue(userId, purpose, ttlMs);
      const path = purpose === "VERIFY_EMAIL" ? "/verify-email" : "/reset-password";
      const base = (env.APP_PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const url = `${base}${path}?token=${encodeURIComponent(token)}`;
      const intro =
        purpose === "VERIFY_EMAIL" ? `Verify your email:\n${url}` : `Reset your password:\n${url}`;
      await this.mailer.sendOrThrow(email, subject, `${intro}\n\n${expiryLine}`);
      return true;
    } catch (error) {
      if (error instanceof MailUnavailableError) {
        logger.error({ err: error, userId }, "Auth email failed");
        return false;
      }
      throw error;
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
      phone: user.phone ?? null,
      country: user.country ?? null,
      timezone: user.timezone ?? null,
      age: user.age ?? null,
      heardAboutUs: user.heardAboutUs ?? null,
      metadata: user.metadata ?? null,
      profileComplete: isProfileComplete(user),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const createUserService = (
  userRepository: IUserRepository,
  prisma: PrismaClient,
  mailer?: IMailer,
  countries?: ICountryRepository
): IUserService => {
  return new UserService(userRepository, prisma, mailer, countries);
};
