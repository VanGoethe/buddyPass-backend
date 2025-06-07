import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { PrismaClient } from "@prisma/client";
import { authConfig } from "./auth";

const prisma = new PrismaClient();

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: authConfig.google.clientId,
      clientSecret: authConfig.google.clientSecret,
      callbackURL: authConfig.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
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
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: authConfig.jwt.secret,
    },
    async (payload, done) => {
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
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

export default passport;
