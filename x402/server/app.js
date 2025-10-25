import { createOpenfortClient } from "./integrations/openfortClient.js";
import { handleProtectedContent } from "./routes/protectedContent.js";
import { handleShieldSession } from "./routes/shieldSession.js";
import { handleHealth } from "./routes/health.js";
import { environment as defaultEnvironment, resolveEnvironment } from "./config/environment.js";

function setCorsHeaders(res, allowedOrigins) {
  const origin = allowedOrigins[0] || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT, X-TRANSACTION-HASH");
  res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE");
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

export function createPaywallServer(runtimeConfig = defaultEnvironment) {
  const env = runtimeConfig ?? resolveEnvironment();
  const openfortClient = createOpenfortClient(env.openfort.secretKey);

  return async (req, res) => {
    // Set CORS headers
    setCorsHeaders(res, env.allowedOrigins);

    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    try {
      if (pathname === "/api/health" && req.method === "GET") {
        await handleHealth(req, res);
      } else if (pathname === "/api/protected-create-encryption-session" && req.method === "POST") {
        await handleShieldSession(req, res, { openfortClient, shieldConfig: env.openfort.shield });
      } else if (pathname === "/api/protected-content") {
        await handleProtectedContent(req, res, { paywall: env.paywall });
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
      }
    } catch (error) {
      console.error("Server error:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  };
}
