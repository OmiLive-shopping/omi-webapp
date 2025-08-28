import 'reflect-metadata';

import { createServer } from 'http';

import { app } from './app.js';
import { env } from './config/env-config.js';
import { PrismaService } from './config/prisma.config.js';
import { SocketService } from './config/socket.config.js';
import { analyticsCleanupJob } from './features/analytics/jobs/cleanup.job.js';

class Server {
  private readonly port: number | string;
  private httpServer: any; // HTTP server instance
  private prisma: PrismaService; // Prisma service instance
  private socket: SocketService; // Socket.io service instance
  private childProcess: any = null; // Placeholder for child processes

  constructor(port: number | string) {
    this.port = port;
    this.prisma = PrismaService.getInstance();
    this.socket = SocketService.getInstance();
  }

  // Start the server
  public start(): void {
    // Create HTTP server
    this.httpServer = createServer(app);

    // Initialize Socket.io
    this.socket.initialize(this.httpServer);

    // Start listening
    this.httpServer.listen(this.port, () => {
      console.log(`Server running at http://localhost:${this.port}`);
      if (env.NODE_ENV !== 'production') {
        console.log(`Socket.io Admin UI available at http://localhost:${this.port}/admin`);
        const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
        console.log(green('──────────────────────────────────────────────────────────────'));
        console.log(green('Backend initialized. New logs start below.'));
        console.log(green('──────────────────────────────────────────────────────────────'));
      }

      // Analytics cleanup job disabled for now
      // analyticsCleanupJob.start(24);
      // console.log('Analytics cleanup job started');
    });

    // Handle system signals for graceful shutdown
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
  }

  // Graceful shutdown logic
  private async gracefulShutdown(): Promise<void> {
    console.log('Received shutdown signal, shutting down gracefully...');
    try {
      // Stop analytics cleanup job (disabled for now)
      // analyticsCleanupJob.stop();

      // Stop accepting new connections
      this.httpServer.close(async () => {
        console.log('No new requests are being accepted.');

        try {
          // Close DB and WebSocket connections
          await this.closeDBConnection();
          await this.closeWSConnection();

          if (this.childProcess) {
            this.childProcess.kill('SIGINT');
            console.log('Child processes terminated.');
          }

          console.log('All connections closed, shutting down...');
          process.exit(0); // Successful exit
        } catch (err) {
          console.error('Error during shutdown:', err);
          process.exit(1); // Exit with error if closing connections failed
        }
      });

      // Timeout to force shutdown if requests are still pending
      setTimeout(() => {
        console.error('Forcing shutdown due to timeout.');
        process.exit(1);
      }, 10000); // Timeout in 10 seconds
    } catch (err) {
      console.error('Failed to initiate graceful shutdown:', err);
      process.exit(1); // Exit with error if initial shutdown fails
    }
  }

  // Close database connection
  private async closeDBConnection(): Promise<void> {
    console.log('Closing database connection...');
    try {
      await this.prisma.disconnect(); // Gracefully disconnect Prisma
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error closing database connection:', err);
      throw err; // Re-throw to handle the error in the shutdown sequence
    }
  }

  // Close WebSocket connections
  private async closeWSConnection(): Promise<void> {
    console.log('Closing WebSocket connections...');
    try {
      await this.socket.close();
      console.log('WebSocket connections closed.');
    } catch (err) {
      console.error('Error closing WebSocket connections:', err);
      throw err; // Re-throw to handle the error in the shutdown sequence
    }
  }

  // Handle uncaught exceptions
  private handleUncaughtException(error: Error): void {
    console.error('Uncaught Exception:', error.message);
    process.exit(1); // Exit with error code for unexpected issues
  }

  // Handle unhandled promise rejections
  private handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    console.error('Unhandled Rejection:', reason);
    console.error('Unhandled promise:', promise);
    process.exit(1); // Exit with error status for unhandled rejections
  }
}

// Initialize and start the server
const PORT = Number(env.PORT) || 9000;
const server = new Server(PORT);
server.start();
