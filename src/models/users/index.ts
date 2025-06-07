/**
 * User Models
 */

import { User as PrismaUser } from "@prisma/client";

// Re-export the User type from types for consistency
export {
  User,
  UserResponse,
  CreateUserData,
  UpdateUserData,
} from "../../types/users";

// Prisma User type mapping
export type PrismaUserType = PrismaUser;

// User entity class (optional, for business logic)
export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string | null = null,
    public readonly avatar: string | null = null,
    public readonly googleId: string | null = null,
    public readonly provider: string | null = null,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

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
  isOAuthUser(): boolean {
    return this.provider === "google" && !!this.googleId;
  }

  // Check if user is local user
  isLocalUser(): boolean {
    return this.provider === "local";
  }
}
