import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Add process error handlers for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = ['NODE_ENV'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Some features may not work properly.');
  }
  
  // Generate a default session secret if not provided (for development only)
  if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('SESSION_SECRET is required in production');
      process.exit(1);
    } else {
      process.env.SESSION_SECRET = 'dev-session-secret-' + Math.random().toString(36);
      console.warn('Using auto-generated SESSION_SECRET for development');
    }
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Main server startup function with error handling
async function startServer() {
  try {
    // Validate environment before starting
    validateEnvironment();
    
    const server = await registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Server error:', err);
      res.status(status).json({ message });
    });

    // Setup development or production environment
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Port configuration with Cloud Run compatibility
    // In production/deployment, Cloud Run assigns PORT dynamically
    // In development, default to 5000
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Validate port number
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${process.env.PORT}`);
    }

    // Start server with error handling
    server.listen({
      port,
      host: "0.0.0.0", // Required for Cloud Run - don't use localhost
      reusePort: true,
    }, () => {
      log(`Server successfully started on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'unknown'}`);
      console.log(`Listening on: http://0.0.0.0:${port}`);
    });
    
    // Handle server errors
    server.on('error', (err: any) => {
      console.error('Server startup error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
