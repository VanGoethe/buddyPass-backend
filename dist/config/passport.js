"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_jwt_1 = require("passport-jwt");
const client_1 = require("@prisma/client");
const auth_1 = require("./auth");
const prisma = new client_1.PrismaClient();
// Google OAuth Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: auth_1.authConfig.google.clientId,
    clientSecret: auth_1.authConfig.google.clientSecret,
    callbackURL: auth_1.authConfig.google.callbackUrl,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
        });
        if (user) {
            // Update last login
            user = await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });
            return done(null, user);
        }
        // Check if user exists with same email
        const existingUser = await prisma.user.findUnique({
            where: { email: profile.emails?.[0]?.value },
        });
        if (existingUser) {
            // Link Google account to existing user
            user = await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    googleId: profile.id,
                    provider: "google",
                    avatar: profile.photos?.[0]?.value,
                    lastLoginAt: new Date(),
                },
            });
            return done(null, user);
        }
        // Create new user
        user = await prisma.user.create({
            data: {
                email: profile.emails?.[0]?.value || "",
                name: profile.displayName,
                googleId: profile.id,
                provider: "google",
                avatar: profile.photos?.[0]?.value,
                isVerified: true, // Google accounts are pre-verified
                lastLoginAt: new Date(),
            },
        });
        return done(null, user);
    }
    catch (error) {
        return done(error, false);
    }
}));
// JWT Strategy
passport_1.default.use(new passport_jwt_1.Strategy({
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: auth_1.authConfig.jwt.secret,
}, async (payload, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                isVerified: true,
                isActive: true,
            },
        });
        if (user && user.isActive) {
            return done(null, user);
        }
        return done(null, false);
    }
    catch (error) {
        return done(error, false);
    }
}));
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map