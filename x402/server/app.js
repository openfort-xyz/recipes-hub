import { Hono } from "hono";
import { cors } from "hono/cors";

import { createOpenfortClient } from "./integrations/openfortClient.js";
import { registerProtectedContentRoute } from "./routes/protectedContent.js";
import { registerShieldSessionRoute } from "./routes/shieldSession.js";
import { registerHealthRoute } from "./routes/health.js";
import { environment as defaultEnvironment, resolveEnvironment } from "./config/environment.js";

export function createPaywallServer(runtimeConfig = defaultEnvironment) {
  const env = runtimeConfig ?? resolveEnvironment();

  const app = new Hono();

  app.use(
    "/*",
    cors({
      origin: env.allowedOrigins,
      credentials: true,
      exposeHeaders: ["X-PAYMENT-RESPONSE"],
    }),
  );

  const openfortClient = createOpenfortClient(env.openfort.secretKey);

  registerProtectedContentRoute(app, { paywall: env.paywall });
  registerShieldSessionRoute(app, {
    openfortClient,
    shieldConfig: env.openfort.shield,
  });
  registerHealthRoute(app);

  return app;
}
