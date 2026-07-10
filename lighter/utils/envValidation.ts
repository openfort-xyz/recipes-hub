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
  "YOUR_GAS_SPONSORSHIP_POLICY_ID",
  "https://your-recovery-endpoint.example.com",
  "",
]);

const ENV_RULES: EnvRule[] = [
  {
    extraKey: "openfortPublishableKey",
    envName: "OPENFORT_PUBLISHABLE_KEY",
    description: "Openfort publishable key for initializing the client",
    required: true,
    validate: (value) => (value.startsWith("pk_") ? null : "Expected the publishable key to start with 'pk_'"),
  },
  {
    extraKey: "openfortShieldPublishableKey",
    envName: "SHIELD_PUBLISHABLE_KEY",
    description: "Shield publishable key used for wallet encryption",
    required: true,
  },
  {
    extraKey: "openfortShieldRecoveryBaseUrl",
    envName: "OPENFORT_SHIELD_RECOVERY_BASE_URL",
    description: "Wallet recovery service base URL",
    required: true,
    validate: (value) => {
      try {
        new URL(value);
        return null;
      } catch {
        return "Wallet recovery URL must be a valid URL";
      }
    },
  },
  {
    extraKey: "lighterServerBaseUrl",
    envName: "LIGHTER_SERVER_BASE_URL",
    description: "This recipe's server/ base URL",
    required: true,
    validate: (value) => {
      try {
        new URL(value);
        return null;
      } catch {
        return "Lighter server URL must be a valid URL";
      }
    },
  },
  {
    extraKey: "lighterDepositContractAddress",
    envName: "LIGHTER_DEPOSIT_CONTRACT_ADDRESS",
    description: "Ethereum mainnet Lighter deposit contract",
    required: true,
    validate: (value) => (/^0x[0-9a-fA-F]{40}$/.test(value) ? null : "Must be a valid EVM contract address"),
  },
  {
    extraKey: "usdcContractAddress",
    envName: "USDC_CONTRACT_ADDRESS",
    description: "Ethereum mainnet USDC contract",
    required: true,
    validate: (value) => (/^0x[0-9a-fA-F]{40}$/.test(value) ? null : "Must be a valid EVM contract address"),
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
