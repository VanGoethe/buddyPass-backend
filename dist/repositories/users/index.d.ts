/**
 * User Repository Implementation
 */
import { PrismaClient } from "@prisma/client";
import { IUserRepository, User, CreateUserData, UpdateUserData, FindManyOptions, CountOptions } from "../../types/users";
export declare class PrismaUserRepository implements IUserRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByGoogleId(googleId: string): Promise<User | null>;
    findMany(options?: FindManyOptions): Promise<User[]>;
    count(options?: CountOptions): Promise<number>;
    create(userData: CreateUserData): Promise<User>;
    update(id: string, userData: UpdateUserData): Promise<User>;
    delete(id: string): Promise<void>;
}
export declare const createUserRepository: (prisma: PrismaClient) => IUserRepository;
//# sourceMappingURL=index.d.ts.map