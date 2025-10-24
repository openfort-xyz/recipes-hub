# Claude Code Project Instructions

## Project Overview

This is the **Openfort x402 Modular Demo** - a production-ready reference implementation showcasing how Openfort smart accounts integrate with the x402 payment protocol to create a seamless paywall experience. The codebase is architected for modularity, making it easy to extract and reuse components in other projects.

## Architecture Principles

### 1. **Separation of Concerns**
- **Backend** (`backend/src/`): Express.js server handling x402 payment requirements, Shield session creation, and content delivery
- **Frontend Integration Layer** (`frontend/src/integrations/`): Protocol-specific helpers for Openfort and x402 that have zero UI dependencies
- **Frontend Feature Layer** (`frontend/src/features/`): Self-contained feature modules with their own components, hooks, and utilities

### 2. **Configuration Management**
- Backend environment variables are centralized in `backend/src/config.ts`
- Frontend environment variables use Vite's `VITE_` prefix convention
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

1. **Backend Code** (`backend/src/`):
   - `server.ts`: Express server setup and middleware
   - `config.ts`: Environment parsing and defaults
   - `openfort.ts`: Openfort client initialization
   - `routes.ts`: HTTP endpoint handlers
   - `payment.ts`: Payment validation logic

2. **Frontend Code** (`frontend/src/`):
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
Protocol integrations (`frontend/src/integrations/x402/`, `frontend/src/integrations/openfort/`) must:
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
# Install backend dependencies
cd backend && pnpm install

# Install frontend dependencies
cd frontend && pnpm install

# Run backend (in backend directory)
cd backend && pnpm dev  # http://localhost:3007

# Run frontend (in frontend directory, separate terminal)
cd frontend && pnpm dev  # http://localhost:5173
```

### Before Committing

```bash
# Backend: Type check and build
cd backend && pnpm build

# Frontend: Type check, format and lint
cd frontend && pnpm tsc -b
cd frontend && pnpm check

# Frontend: Build to verify production bundle
cd frontend && pnpm build
```

### Environment Setup

Create `backend/.env.local` and `frontend/.env.local` with:
- Openfort API keys (publishable and secret)
- Shield configuration
- Network settings (base-sepolia or base)
- Payment defaults (amount, token address, recipient)

See [README.md](README.md) for complete environment variable documentation.

## Common Tasks & Guidelines

### Adding a New API Endpoint

1. Add route handler function in `backend/src/routes.ts`
2. Register route in `backend/src/server.ts` using Express
3. Update environment config in `backend/src/config.ts` if new settings needed
4. Add error handling (use standard HTTP error responses)
5. Document endpoint in README.md

### Modifying Payment Logic

1. Server-side validation: `backend/src/payment.ts`
2. Client-side encoding: `frontend/src/integrations/x402/payments.ts`
3. Payment requirements selection: `frontend/src/integrations/x402/requirements.ts`
4. Never bypass validation or skip on-chain verification

### Adding UI Components

1. Place in appropriate feature directory (`frontend/src/features/paywall/components/`)
2. Use Tailwind CSS for styling (v4 syntax)
3. Import Heroicons for icons
4. Keep components pure - logic goes in hooks
5. Export from feature's `index.ts` for clean imports

### Working with Smart Accounts

- Openfort SDK handles account creation and recovery
- Shield sessions are created server-side via `/api/shield-session`
- Wallet activation happens in `frontend/src/features/paywall/PaywallExperience.tsx`
- Never expose Shield secret keys client-side

### Network Handling

- Supported networks: base, base-sepolia
- Network config: `frontend/src/integrations/x402/networks.ts`
- Token addresses: `frontend/src/integrations/x402/contracts.ts`
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
- Helpers in `frontend/src/integrations/x402/`
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
