# Claude Code Project Instructions

## Project Overview

This is the **Openfort x402 Modular Demo** - a production-ready reference implementation showcasing how Openfort smart accounts integrate with the x402 payment protocol to create a seamless paywall experience. The codebase is architected for modularity, making it easy to extract and reuse components in other projects.

## Architecture Principles

### 1. **Separation of Concerns**
- **Server Layer** (`server/`): Hono-based API handling x402 payment requirements, Shield session creation, and content delivery
- **Integration Layer** (`src/integrations/`): Protocol-specific helpers for Openfort and x402 that have zero UI dependencies
- **Feature Layer** (`src/features/`): Self-contained feature modules with their own components, hooks, and utilities

### 2. **Configuration Management**
- All environment variables are centralized in `server/config/environment.js`
- Client-side config uses Vite's `VITE_` prefix convention
- Never hardcode network addresses, token addresses, or payment amounts
- Always use the environment helpers to access configuration

### 3. **Code Style**
- Use Biome for formatting and linting (not Prettier/ESLint)
- TypeScript strict mode enabled
- Prefer functional React components with hooks
- Use explicit types over `any`
- Follow the existing naming conventions (camelCase for functions/variables, PascalCase for components)

## Working with This Codebase

### File Organization Rules

1. **Server Code** (`server/`):
   - `app.js`: Main Hono application assembly
   - `config/`: Environment parsing and defaults
   - `integrations/`: External service clients (Openfort)
   - `routes/`: HTTP endpoint handlers (one file per route group)
   - `services/`: Business logic (payment validation, encoding)

2. **Client Code** (`src/`):
   - `features/paywall/`: Complete paywall feature module
     - `PaywallExperience.tsx`: Main orchestrator component
     - `components/`: UI components for each state
     - `hooks/`: Custom hooks for payment logic
     - `utils/`: Pure utility functions
   - `integrations/`: Framework-agnostic protocol helpers
   - `types/`: Ambient TypeScript declarations

### Key Design Patterns

#### 1. **Feature Modules**
The paywall feature is completely self-contained:
```
features/paywall/
├── PaywallExperience.tsx    # Entry point
├── components/              # UI layer
├── hooks/                   # Logic layer
└── utils/                   # Pure functions
```

When adding new features, follow this pattern. Features should be portable and have minimal external dependencies.

#### 2. **Integration Helpers**
Protocol integrations (`src/integrations/x402/`, `src/integrations/openfort/`) must:
- Be framework-agnostic (except for React provider wrappers)
- Export clear, typed interfaces
- Handle all encoding/decoding logic
- Never import UI components

#### 3. **React Hooks Composition**
Complex stateful logic is broken into focused hooks:
- `usePaymentRequirements`: Fetches x402 payment data
- `useUsdcBalance`: Monitors token balance
- `usePaymentReceipt`: Tracks transaction status
- `useContentUnlocker`: Manages content access after payment

When adding logic, create new hooks rather than bloating existing components.

## Development Workflow

### Running the Application

```bash
# Install dependencies
pnpm install

# Run both server and client
pnpm dev:all

# Or run separately
pnpm server  # http://localhost:3007
pnpm dev     # http://localhost:5173
```

### Before Committing

```bash
# Type check
pnpm tsc -b

# Format and lint
pnpm check

# Build to verify production bundle
pnpm build
```

### Environment Setup

Copy `.env.local.example` (if exists) or create `.env.local` with:
- Openfort API keys (publishable and secret)
- Shield configuration
- Network settings (base-sepolia or base)
- Payment defaults (amount, token address, recipient)

See [README.md](README.md) for complete environment variable documentation.

## Common Tasks & Guidelines

### Adding a New API Endpoint

1. Create route handler in `server/routes/`
2. Add route to `server/app.js`
3. Update environment config if new settings needed
4. Add error handling (use Hono's HTTP exception helpers)
5. Document endpoint in README.md

### Modifying Payment Logic

1. Server-side validation: `server/services/paymentRequirements.js`
2. Client-side encoding: `src/integrations/x402/payments.ts`
3. Payment requirements selection: `src/integrations/x402/requirements.ts`
4. Never bypass validation or skip on-chain verification

### Adding UI Components

1. Place in appropriate feature directory (`features/paywall/components/`)
2. Use Tailwind CSS for styling (v4 syntax)
3. Import Heroicons for icons
4. Keep components pure - logic goes in hooks
5. Export from feature's `index.ts` for clean imports

### Working with Smart Accounts

- Openfort SDK handles account creation and recovery
- Shield sessions are created server-side via `/api/shield-session`
- Wallet activation happens in `PaywallExperience.tsx`
- Never expose Shield secret keys client-side

### Network Handling

- Supported networks: base, base-sepolia
- Network config: `src/integrations/x402/networks.ts`
- Token addresses: `src/integrations/x402/contracts.ts`
- Wagmi handles network switching automatically

## Code Quality Standards

### TypeScript
- Enable strict mode
- No `any` types without justification
- Use type guards for runtime validation
- Export types from dedicated `types.ts` files

### React
- Use functional components exclusively
- Hooks for all stateful logic
- Memoize expensive computations
- Clean up effects properly (return cleanup functions)

### Error Handling
- Always handle async errors
- Provide user-friendly error messages
- Log detailed errors server-side
- Never expose internal errors to clients

### Performance
- Code-split large features

## Testing Philosophy

This is a demo/reference implementation, so comprehensive test coverage is not required. However:
- Ensure manual testing of complete flows
- Test on both base and base-sepolia
- Verify payment amounts are correct
- Test wallet creation and recovery flows
- Validate error states render properly

## Integration Points

### Openfort SDK
- Client: `@openfort/react` for UI components and hooks
- Server: `@openfort/openfort-node` for API operations
- Shield: Secure key management for embedded wallets

### x402 Protocol
- Custom implementation (not an SDK)
- Helpers in `src/integrations/x402/`
- Spec-compliant encoding and validation

### Blockchain (via viem/wagmi)
- viem for low-level operations
- wagmi for React integration
- Public clients for transaction monitoring

## Common Pitfalls to Avoid

1. Don't mix UI and protocol logic
2. Don't hardcode addresses or amounts
3. Don't skip environment variable validation
4. Don't bypass payment verification
5. Don't commit secrets to git
6. Don't ignore TypeScript errors
7. Don't create files outside the established structure

## Getting Help

- Check [README.md](README.md) for setup and configuration
- Review existing implementations before adding new code
- Follow the modular patterns already established
- Consult Openfort docs for SDK-specific questions
- Review x402 spec for protocol compliance

## Philosophy

This codebase prioritizes:
1. **Clarity** over cleverness
2. **Modularity** over monolithic structures
3. **Type safety** over runtime checks
4. **Explicit** over implicit behavior
5. **Reusability** over one-off solutions

When in doubt, follow the patterns already established in the codebase.
