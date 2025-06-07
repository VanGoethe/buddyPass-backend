"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.authConfig = {
    jwt: {
        secret: process.env.JWT_SECRET || "fallback_secret",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackUrl: process.env.GOOGLE_CALLBACK_URL ||
            "http://localhost:3000/api/auth/google/callback",
    },
    bcrypt: {
        saltRounds: 12,
    },
};
//# sourceMappingURL=auth.js.map