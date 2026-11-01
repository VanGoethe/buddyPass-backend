import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth";
import { env } from "../config/env";
import { getPrismaClient } from "../config/database";
import { logger } from "../utils/logger";

export interface NotificationPush {
  id: string;
  recipientUserId: string;
  kind: string;
  body: string;
  subscriptionId: string | null;
  slotId: string | null;
  paymentId: string | null;
  stage: string;
  readAt: string | null;
  createdAt: string;
}

export interface LoginCodePush {
  slotId: string | null;
  code: string;
  receivedAt: string;
  source: "INBOX" | "ADMIN";
}

export interface SeatReadyPush {
  slotId: string;
  subscriptionId: string;
  serviceName: string;
  termEndsAt: string | null;
  renewed: boolean;
}

export interface LoginCodeStatusPush {
  slotId: string;
  phase: "active" | "queued";
  position: number;
  estimatedStartAt: string | null;
  watchingUntil: string | null;
}

export interface LoginCodeMissedPush {
  slotId: string;
}

export interface INotificationPublisher {
  publishNotification(userId: string, view: NotificationPush, urgent: boolean): void;
  publishLoginCode(userId: string, view: LoginCodePush): void;
  publishSeatReady(userId: string, view: SeatReadyPush): void;
  publishLoginCodeStatus(userId: string, view: LoginCodeStatusPush): void;
  publishLoginCodeMissed(userId: string, view: LoginCodeMissedPush): void;
  publishToAdmins(event: string, payload: LoginCodePush): void;
  attach(httpServer: HttpServer): void;
  close(): Promise<void>;
}

interface HandshakeIdentity {
  userId: string;
  role: string;
  exp: number;
}

function readToken(token: unknown): { userId: string; exp: number } | null {
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }
  try {
    const payload = jwt.verify(token, authConfig.jwt.secret, {
      algorithms: ["HS256"],
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });
    if (typeof payload !== "object" || payload === null) {
      return null;
    }
    const userId = "userId" in payload ? payload.userId : undefined;
    const exp = "exp" in payload ? payload.exp : undefined;
    if (typeof userId !== "string" || userId.length === 0 || typeof exp !== "number") {
      return null;
    }
    return { userId, exp };
  } catch {
    return null;
  }
}

export class NotificationPublisher implements INotificationPublisher {
  private io: Server | null = null;
  private redis: Redis[] = [];

  publishNotification(userId: string, view: NotificationPush, urgent: boolean): void {
    this.emit(`user:${userId}`, "notification", { ...view, urgent });
  }

  publishLoginCode(userId: string, view: LoginCodePush): void {
    this.emit(`user:${userId}`, "login-code", view);
  }

  publishSeatReady(userId: string, view: SeatReadyPush): void {
    this.emit(`user:${userId}`, "seat-ready", view);
  }

  publishLoginCodeStatus(userId: string, view: LoginCodeStatusPush): void {
    this.emit(`user:${userId}`, "login-code-status", view);
  }

  publishLoginCodeMissed(userId: string, view: LoginCodeMissedPush): void {
    this.emit(`user:${userId}`, "login-code-missed", view);
  }

  publishToAdmins(event: string, payload: LoginCodePush): void {
    this.emit("admins", event, payload);
  }

  attach(httpServer: HttpServer): void {
    if (this.io) {
      return;
    }
    const io = new Server(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
      },
    });
    this.attachRedis(io);
    io.use((socket, next) => {
      void this.authenticate(socket.handshake.auth?.token)
        .then((identity) => {
          if (!identity) {
            next(new Error("Unauthorized"));
            return;
          }
          socket.data.userId = identity.userId;
          socket.data.role = identity.role;
          socket.data.exp = identity.exp;
          next();
        })
        .catch((error: unknown) => {
          logger.error({ err: error }, "Socket authentication failed");
          next(new Error("Unauthorized"));
        });
    });
    io.on("connection", (socket) => {
      const userId = socket.data.userId as string;
      const role = socket.data.role as string;
      const exp = socket.data.exp as number;
      void socket.join(`user:${userId}`);
      if (role === "ADMIN") {
        void socket.join("admins");
      }
      const delay = exp * 1000 - Date.now();
      const timer = setTimeout(() => {
        socket.disconnect(true);
      }, Math.max(delay, 0));
      socket.on("disconnect", () => {
        clearTimeout(timer);
      });
    });
    this.io = io;
  }

  async close(): Promise<void> {
    const io = this.io;
    this.io = null;
    if (io) {
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
      });
    }
    await Promise.all(
      this.redis.map(async (client) => {
        try {
          await client.quit();
        } catch (error) {
          logger.error({ err: error }, "Socket redis client close failed");
          client.disconnect();
        }
      })
    );
    this.redis = [];
  }

  private emit(room: string, event: string, payload: unknown): void {
    if (!this.io) {
      return;
    }
    try {
      this.io.to(room).emit(event, payload);
    } catch (error) {
      logger.error({ err: error, event }, "Notice push failed");
    }
  }

  private attachRedis(io: Server): void {
    if (!env.REDIS_URL) {
      return;
    }
    const pub = new Redis(env.REDIS_URL);
    const sub = pub.duplicate();
    for (const client of [pub, sub]) {
      client.on("error", (error: Error) => {
        logger.error({ err: error }, "Socket redis adapter error");
      });
    }
    io.adapter(createAdapter(pub, sub));
    this.redis.push(pub, sub);
  }

  private async authenticate(token: unknown): Promise<HandshakeIdentity | null> {
    const payload = readToken(token);
    if (!payload) {
      return null;
    }
    const user = await getPrismaClient().user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return null;
    }
    return { userId: user.id, role: user.role, exp: payload.exp };
  }
}
