# 7702 Sample - Agent Guide

## Project Overview
Next.js 15 + TypeScript sample demonstrating EIP-7702 authorization using Openfort embedded wallets with Permissionless and Pimlico for gasless transactions.

## Setup Commands

### Prerequisites
- Node.js 18+ (check with `node -v`)
- pnpm 10.16.1+ (managed via packageManager field)

### Install Dependencies
```bash
cd 7702
pnpm install
```

### Environment Variables
Create a `.env.local` file with:
```
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=your_openfort_key
NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY=your_shield_key
NEXT_PUBLIC_OPENFORT_POLICY_ID=your_policy_id
NEXT_PUBLIC_CREATE_ENCRYPTED_SESSION_ENDPOINT=your_session_endpoint
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_key
NEXT_PUBLIC_SPONSORSHIP_POLICY_ID=your_sponsorship_policy_id
NEXT_PUBLIC_SEPOLIA_RPC_URL=your_sepolia_rpc_url
OPENFORT_SECRET_KEY=your_secret_key
```

### Development
```bash
pnpm dev
```

### Build
```bash
pnpm build
```

## Testing Instructions

### Linting & Formatting
```bash
# Run biome check (format + lint + organize imports)
pnpm check

# Run biome lint only
pnpm lint

# Run biome format only
pnpm format
```

### Manual Testing
1. Start the dev server: `pnpm dev`
2. Open http://localhost:3000
3. Sign in with email, Google, or guest mode
4. Test EIP-7702 authorization flow
5. Send a gasless transaction
6. Verify transaction on Sepolia Etherscan

## Code Style

- Next.js 15 with TypeScript and React 19
- Biome for formatting and linting
- Uses pnpm for package management
- 2-space indentation
- Single quotes, trailing commas (ES5), semicolons as needed
- Organize imports automatically via Biome

### Key Patterns
- Functional React components with hooks
- Wagmi for Ethereum interactions
- Viem for low-level client operations
- Openfort React SDK for embedded wallets
- Permissionless SDK for smart account operations

## Project Structure

```
7702/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes (Shield session)
│   │   └── page.tsx      # Main application page
│   ├── components/       # React components
│   │   ├── ui/           # UI components (button, card)
│   │   ├── Providers.tsx # App providers (Openfort, Wagmi, etc.)
│   │   └── UserOperation.tsx # User operation component
│   └── lib/              # Utility functions
│       ├── utils.ts      # General utilities
│       └── wagmiConfig.ts # Wagmi configuration
├── public/               # Static assets
├── biome.json           # Biome configuration
├── package.json         # Dependencies and scripts
├── pnpm-lock.yaml       # pnpm lockfile
└── tsconfig.json        # TypeScript configuration
```

## Common Issues

### Build Errors
- Ensure all environment variables are set
- Run `pnpm install` to ensure dependencies are up to date
- Check Node.js version (requires 18+)

### Linting Errors
- Run `pnpm check` to auto-fix most issues
- For CSS at-rule warnings: these are disabled for Tailwind CSS directives

## PR Instructions

- Title format: `[7702] <summary>`
- Document any environment variable changes in README.md and this file
- Run `pnpm check` before committing to ensure code style compliance
- Test the EIP-7702 flow end-to-end before requesting review

