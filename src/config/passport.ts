import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { authConfig } from "./auth";
import { env } from "./env";
import { getPrismaClient } from "./database";
import { GoogleProfile } from "../types/users";

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: Express.User | false) => void
      ) => {
        const emailEntry = profile.emails?.[0];
        if (!emailEntry?.value) {
          done(null, false);
          return;
        }

        const googleProfile: GoogleProfile = {
          googleId: profile.id,
          email: emailEntry.value,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          emailVerified: emailEntry.verified === true,
        };
        done(null, googleProfile as unknown as Express.User);
      }
    )
  );
}

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: authConfig.jwt.secret,
      algorithms: ["HS256"],
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    },
    async (payload: { userId?: string }, done) => {
      try {
        if (!payload.userId) {
          done(null, false);
          return;
        }
        const user = await getPrismaClient().user.findUnique({
          where: { id: payload.userId },
        });
        if (user && user.isActive) {
          done(null, user);
          return;
        }
        done(null, false);
      } catch (error) {
        done(error as Error, false);
      }
    }
  )
);

export default passport;
