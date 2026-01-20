interface EnvConfig {
  VITE_OPENFORT_PUBLISHABLE_KEY: string;
  VITE_OPENFORT_POLICY_ID: string;
  VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY: string;
  VITE_WALLET_CONNECT_PROJECT_ID: string;
  VITE_BACKEND_URL: string;
}

interface ValidationError {
  key: string;
  message: string;
}

const ENV_DESCRIPTIONS = {
  VITE_OPENFORT_PUBLISHABLE_KEY: "Openfort project publishable key for client-side authentication",
  VITE_OPENFORT_POLICY_ID: "Policy ID for Ethereum provider configuration",
  VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY: "Openfort Shield publishable key for wallet encryption",
  VITE_WALLET_CONNECT_PROJECT_ID: "WalletConnect project ID for wallet connections",
  VITE_BACKEND_URL: "Backend API URL",
};

export function validateEnvironmentVariables(): ValidationError[] {
  const errors: ValidationError[] = [];

  const requiredVars: Array<keyof EnvConfig> = [
    'VITE_OPENFORT_PUBLISHABLE_KEY',
    'VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY',
    'VITE_BACKEND_URL'
  ];

  requiredVars.forEach(key => {
    const value = import.meta.env[key];

    if (!value || value.trim() === '') {
      errors.push({
        key,
        message: `${ENV_DESCRIPTIONS[key]} is required but not set`
      });
      return;
    }

    if (key === 'VITE_BACKEND_URL') {
      try {
        new URL(value);
      } catch {
        errors.push({
          key,
          message: `${ENV_DESCRIPTIONS[key]} must be a valid URL`
        });
      }
    }

    if (key === 'VITE_OPENFORT_PUBLISHABLE_KEY' && !value.startsWith('pk_')) {
      errors.push({
        key,
        message: 'Openfort publishable key should start with "pk_"'
      });
    }

    if (key === 'VITE_OPENFORT_POLICY_ID' && !value.startsWith('pol_')) {
      errors.push({
        key,
        message: 'Openfort policy ID should start with "pol_"'
      });
    }
  });

  return errors;
}

export function getEnvironmentStatus() {
  const errors = validateEnvironmentVariables();
  return {
    isValid: errors.length === 0,
    errors
  };
}