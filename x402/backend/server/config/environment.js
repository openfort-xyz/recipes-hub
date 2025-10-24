function parseOrigins(rawOrigins) {
  if (!rawOrigins) return [];
  return rawOrigins.split(",").map(origin => origin.trim()).filter(Boolean);
}

function toNumber(value) {
  if (!value) return undefined;
  const parsed = Number.parseInt(`${value}`, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveEnvironment(overrides = {}) {
  return {
    port: overrides.port ?? toNumber(process.env.PORT),
    allowedOrigins: overrides.allowedOrigins ?? parseOrigins(process.env.CORS_ORIGINS),
    paywall: {
      payToAddress: overrides.paywall?.payToAddress ?? process.env.PAY_TO_ADDRESS ?? process.env.ADDRESS,
      payment: {
        scheme: "exact",
        network: overrides.paywall?.payment?.network ?? process.env.X402_NETWORK,
        resource: overrides.paywall?.payment?.resource ?? process.env.X402_RESOURCE,
        description: overrides.paywall?.payment?.description ?? process.env.X402_DESCRIPTION,
        mimeType: overrides.paywall?.payment?.mimeType ?? process.env.X402_MIME_TYPE,
        maxAmountRequired: overrides.paywall?.payment?.maxAmountRequired ?? process.env.X402_MAX_AMOUNT,
        maxTimeoutSeconds: overrides.paywall?.payment?.maxTimeoutSeconds ?? toNumber(process.env.X402_TIMEOUT),
        asset: overrides.paywall?.payment?.asset ?? process.env.X402_ASSET_ADDRESS,
        extra: {
          name: overrides.paywall?.payment?.extra?.name ?? process.env.X402_ASSET_NAME,
          version: overrides.paywall?.payment?.extra?.version ?? process.env.X402_ASSET_VERSION,
        },
      },
    },
    openfort: {
      secretKey: overrides.openfort?.secretKey ?? process.env.OPENFORT_SECRET_KEY,
      shield: {
        publishableKey: overrides.openfort?.shield?.publishableKey ?? process.env.OPENFORT_SHIELD_PUBLISHABLE_KEY,
        secretKey: overrides.openfort?.shield?.secretKey ?? process.env.OPENFORT_SHIELD_SECRET_KEY,
        encryptionShare: overrides.openfort?.shield?.encryptionShare ?? process.env.OPENFORT_SHIELD_ENCRYPTION_SHARE,
      },
    },
  };
}

export const environment = resolveEnvironment();
