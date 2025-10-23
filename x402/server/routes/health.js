export function registerHealthRoute(app) {
  app.get("/api/health", c => {
    return c.json({
      status: "ok",
      message: "x402 demo server is running",
    });
  });
}
