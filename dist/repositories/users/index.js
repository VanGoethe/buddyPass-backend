"use strict";
/**
 * User Repository Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRepository = exports.PrismaUserRepository = void 0;
const users_1 = require("../../types/users");
class PrismaUserRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        return user;
    }
    async findByEmail(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        return user;
    }
    async findByGoogleId(googleId) {
        const user = await this.prisma.user.findUnique({
            where: { googleId },
        });
        return user;
    }
    async findMany(options) {
        const { page = 1, limit = 10, role, isActive, orderBy = { field: "createdAt", direction: "desc" }, } = options || {};
        const skip = (page - 1) * limit;
        const where = {};
        if (role !== undefined) {
            where.role = role;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        const users = await this.prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                [orderBy.field]: orderBy.direction,
            },
        });
        return users;
    }
    async count(options) {
        const { role, isActive } = options || {};
        const where = {};
        if (role !== undefined) {
            where.role = role;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        const count = await this.prisma.user.count({
            where,
        });
        return count;
    }
    async create(userData) {
        const user = await this.prisma.user.create({
            data: {
                email: userData.email,
                password: userData.password,
                name: userData.name,
                googleId: userData.googleId,
                provider: userData.provider,
                avatar: userData.avatar,
                role: userData.role || users_1.UserRole.USER,
            },
        });
        return user;
    }
    async update(id, userData) {
        const user = await this.prisma.user.update({
            where: { id },
            data: userData,
        });
        return user;
    }
    async delete(id) {
        await this.prisma.user.delete({
            where: { id },
        });
    }
}
exports.PrismaUserRepository = PrismaUserRepository;
// Export a factory function to create repository instance
const createUserRepository = (prisma) => {
    return new PrismaUserRepository(prisma);
};
exports.createUserRepository = createUserRepository;
//# sourceMappingURL=index.js.map