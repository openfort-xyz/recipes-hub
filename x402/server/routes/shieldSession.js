function hasShieldConfiguration(shieldConfig) {
  return Boolean(
    shieldConfig?.publishableKey &&
      shieldConfig?.secretKey &&
      shieldConfig?.encryptionShare,
  );
}

export function registerShieldSessionRoute(app, { openfortClient, shieldConfig }) {
  app.post("/api/shield-session", async c => {
    if (!openfortClient || !hasShieldConfiguration(shieldConfig)) {
      return c.json({
        error: "Openfort Shield configuration is missing.",
      }, 500);
    }

    try {
      const session = await openfortClient.iam.createRecoverySession({
        shieldPublishableKey: shieldConfig.publishableKey,
        shieldSecretKey: shieldConfig.secretKey,
        shieldEncryptionShare: shieldConfig.encryptionShare,
      });
      return c.json({ session: session.id });
    } catch (error) {
      console.error("Shield session error:", error);
      return c.json({
        error: "Failed to create recovery session",
        details: error instanceof Error ? error.message : "Unknown error",
      }, 500);
    }
  });
}
