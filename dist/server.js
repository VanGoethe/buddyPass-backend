"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
// Load environment variables
dotenv_1.default.config();
/**
 * Server startup and configuration
 */
class Server {
    constructor() {
        this.app = new app_1.default();
        this.port = parseInt(process.env.PORT || "3000", 10);
    }
    async start() {
        try {
            // Initialize database connection
            await (0, database_1.connectDatabase)();
            // Start server
            this.app.app.listen(this.port, () => {
                console.log(`🚀 Server running on port ${this.port}`);
                console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
                console.log(`🔗 Health check: http://localhost:${this.port}/health`);
            });
        }
        catch (error) {
            console.error("❌ Failed to start server:", error);
            process.exit(1);
        }
    }
    async stop() {
        // Graceful shutdown logic here
        console.log("🛑 Server shutting down...");
        process.exit(0);
    }
}
// Handle graceful shutdown
process.on("SIGTERM", async () => {
    const server = new Server();
    await server.stop();
});
process.on("SIGINT", async () => {
    const server = new Server();
    await server.stop();
});
// Start server
const server = new Server();
server.start();
//# sourceMappingURL=server.js.map