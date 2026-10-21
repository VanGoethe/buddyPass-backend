import { randomUUID } from "crypto";
import { IncomingMessage, ServerResponse } from "http";
import pinoHttp from "pino-http";
import { logger } from "../utils/logger";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const header = req.headers["x-request-id"];
    const id = (Array.isArray(header) ? header[0] : header) || randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
});
