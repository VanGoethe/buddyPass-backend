import dotenv from "dotenv";
import App from "./app";
import { connectDatabase } from "./config/database";

// Load environment variables
dotenv.config();

/**
 * Server startup and configuration
 */
class Server {
  private app: App;
  private port: number;

  constructor() {
    this.app = new App();
    this.port = parseInt(process.env.PORT || "3000", 10);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connection
      await connectDatabase();

      // Start server
      this.app.app.listen(this.port, () => {
        console.log(`🚀 Server running on port ${this.port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`🔗 Health check: http://localhost:${this.port}/health`);
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
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
