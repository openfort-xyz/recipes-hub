function hasShieldConfiguration(shieldConfig) {
  return Boolean(
    shieldConfig?.publishableKey &&
      shieldConfig?.secretKey &&
      shieldConfig?.encryptionShare,
  );
}

export async function handleShieldSession(req, res, { openfortClient, shieldConfig }) {
  if (!openfortClient || !hasShieldConfiguration(shieldConfig)) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Openfort Shield configuration is missing.",
    }));
    return;
  }

  try {
    const session = await openfortClient.iam.createRecoverySession({
      shieldPublishableKey: shieldConfig.publishableKey,
      shieldSecretKey: shieldConfig.secretKey,
      shieldEncryptionShare: shieldConfig.encryptionShare,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ session: session.id }));
  } catch (error) {
    console.error("Shield session error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Failed to create recovery session",
      details: error instanceof Error ? error.message : "Unknown error",
    }));
  }
}
