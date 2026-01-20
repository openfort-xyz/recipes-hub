import Constants from "expo-constants";

export interface ValidationError {
  key: string;
  message: string;
}

interface EnvRule {
  extraKey: string;
  envName: string;
  description: string;
  required: boolean;
  validate?: (value: string) => string | null;
}

const PLACEHOLDER_VALUES = new Set([
  "YOUR_PROJECT_PUBLISHABLE_KEY",
  "YOUR_SHIELD_PUBLISHABLE_KEY",
  "YOUR_SHIELD_ENCRYPTION_SHARE",
  "YOUR_GAS_SPONSORSHIP_POLICY_ID",
  "https://your-recovery-endpoint.example.com",
  "",
]);

const ENV_RULES: EnvRule[] = [
  {
    extraKey: "openfortPublishableKey",
    envName: "OPENFORT_PROJECT_PUBLISHABLE_KEY",
    description: "Openfort publishable key for initializing the client",
    required: true,
    validate: (value) =>
      value.startsWith("pk_")
        ? null
        : "Expected the publishable key to start with 'pk_'",
  },
  {
    extraKey: "openfortShieldPublishableKey",
    envName: "OPENFORT_SHIELD_PUBLISHABLE_KEY",
    description: "Shield publishable key used for wallet encryption",
    required: true,
  },
  {
    extraKey: "openfortShieldEncryptionShare",
    envName: "OPENFORT_SHIELD_ENCRYPTION_SHARE",
    description: "Shield encryption share required for signing requests",
    required: true,
  },
  {
    extraKey: "openfortShieldRecoveryBaseUrl",
    envName: "OPENFORT_SHIELD_RECOVERY_BASE_URL",
    description: "Wallet recovery service base URL",
    required: true,
    validate: (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" ? null : "Wallet recovery URL must use HTTPS";
      } catch {
        return "Wallet recovery URL must be a valid URL";
      }
    },
  },
];

function getExtraValue(key: string): string | undefined {
  return Constants.expoConfig?.extra?.[key] as string | undefined;
}

function isMissing(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  return PLACEHOLDER_VALUES.has(value.trim());
}

export function validateEnvironmentVariables(): ValidationError[] {
  const errors: ValidationError[] = [];

  ENV_RULES.forEach((rule) => {
    const rawValue = getExtraValue(rule.extraKey);
    const value = rawValue?.trim();

    if (isMissing(value)) {
      if (rule.required) {
        errors.push({
          key: rule.envName,
          message: `${rule.description} is required but missing.`,
        });
      }
      return;
    }

    if (rule.validate && value) {
      const validationError = rule.validate(value);
      if (validationError) {
        errors.push({
          key: rule.envName,
          message: validationError,
        });
      }
    }
  });

  return errors;
}

export function getEnvironmentStatus() {
  const errors = validateEnvironmentVariables();
  return {
    isValid: errors.length === 0,
    errors,
  };
}
