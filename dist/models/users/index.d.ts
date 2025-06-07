/**
 * User Models
 */
import { User as PrismaUser } from "@prisma/client";
export { User, UserResponse, CreateUserData, UpdateUserData, } from "../../types/users";
export type PrismaUserType = PrismaUser;
export declare class UserEntity {
    readonly id: string;
    readonly email: string;
    readonly name: string | null;
    readonly avatar: string | null;
    readonly googleId: string | null;
    readonly provider: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    constructor(id: string, email: string, name?: string | null, avatar?: string | null, googleId?: string | null, provider?: string | null, createdAt?: Date, updatedAt?: Date);
    toResponse(): {
        id: string;
        email: string;
        name: string | null;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    };
    isOAuthUser(): boolean;
    isLocalUser(): boolean;
}
//# sourceMappingURL=index.d.ts.map