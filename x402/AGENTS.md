# AI Agent Instructions

This document provides specific guidance for AI coding assistants working with the Openfort x402 demo codebase.

## Quick Context

You are working on a **React + Vite + Express.js** application that demonstrates x402 payment protocol integration with Openfort smart accounts. The stack includes:
- Frontend: React 18, TypeScript, Tailwind CSS v4, Wagmi, viem
- Backend: Express.js 5, TypeScript, Openfort Node SDK
- Tools: Biome (not Prettier), pnpm (not npm), TypeScript 5.8

## Critical Rules

### 1. Never Create These Files
- Do NOT create `README.md` files unless explicitly asked
- Do NOT create generic documentation
- Do NOT add comments to git commits beyond what's requested
- Do NOT create test files unless specifically requested

### 2. File Modification Protocol
- ALWAYS read existing files before editing
- PRESERVE existing code style and formatting
- USE the Edit tool for modifications, not Write
- CHECK Biome rules before making style changes

### 3. Code Standards
- NO `any` types without explicit justification
- NO hardcoded addresses, amounts, or API keys
- NO UI imports in `frontend/src/integrations/` code
- NO console.logs in production code paths
- YES to explicit error handling
- YES to TypeScript strict mode compliance

## Project-Specific Patterns

### Component Structure
When creating React components:
```typescript
// ✅ GOOD
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // Hooks at top
  // Logic in middle
  // Return JSX at bottom
}

// ❌ BAD
export default function MyComponent(props: any) {
  // Mixed logic and JSX
}
```

### Hook Creation
Custom hooks should:
- Start with `use` prefix
- Return object with named properties (not arrays)
- Include error states
- Clean up side effects

Example:
```typescript
export function useMyFeature() {
  return {
    data,
    isLoading,
    error,
    refetch,
  }
}
```

### Environment Variables
- Server-side: Access via `process.env.VARIABLE_NAME` (configured in `backend/.env.local`)
- Client-side: Must have `VITE_` prefix (configured in `frontend/.env.local`)
- Always validate in `backend/src/config.ts`
- Never inline values that should be configurable

## Common Task Patterns

### Adding an API Endpoint

1. Create handler in `backend/src/routes.ts`:
```typescript
export async function handleNewEndpoint(req: express.Request, res: express.Response) {
  try {
    // Implementation
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in handleNewEndpoint:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
```

2. Register in `backend/src/server.ts`:
```typescript
import { handleNewEndpoint } from './routes.js'
// Add route:
app.get("/api/new-endpoint", handleNewEndpoint);
```

### Adding a UI Component

1. Place in feature directory: `frontend/src/features/paywall/components/NewComponent.tsx`
2. Use this template:
```typescript
interface NewComponentProps {
  // Props
}

export function NewComponent({ }: NewComponentProps) {
  return (
    <div className="...tailwind classes...">
      {/* Content */}
    </div>
  )
}
```

3. Export from `frontend/src/features/paywall/index.ts`:
```typescript
export { NewComponent } from './components/NewComponent'
```

### Adding x402 Protocol Logic

Place in `frontend/src/integrations/x402/`:
- Pure TypeScript (no React)
- Export typed functions
- No side effects
- Example location: `frontend/src/integrations/x402/myFeature.ts`

### Modifying Payment Flow

Key files:
- Server validation: `backend/src/payment.ts`
- Client encoding: `frontend/src/integrations/x402/payments.ts`
- UI orchestration: `frontend/src/features/paywall/PaywallExperience.tsx`
- Balance checks: `frontend/src/features/paywall/hooks/useUsdcBalance.ts`

## Debugging Guidance

### When Something Doesn't Work

1. Check environment variables are set
2. Verify network matches (base vs base-sepolia)
3. Confirm token addresses match network
4. Check browser console for client errors
5. Check server logs for API errors
6. Verify Openfort API keys are valid

### Common Issues

**Problem**: Transaction fails
- Check: USDC balance sufficient?
- Check: Correct network selected?
- Check: Policy ID matches environment?

**Problem**: Shield session fails
- Check: Server secrets configured?
- Check: Encryption share present?
- Check: API endpoint accessible?

**Problem**: Build fails
- Run: `pnpm tsc -b` for type errors
- Run: `pnpm check` for lint errors
- Check: All imports resolve correctly

### Command Patterns
```bash
# Install frontend dependencies
cd frontend && pnpm install <package>

# Install backend dependencies
cd backend && pnpm install <package>

# Type check frontend
cd frontend && pnpm tsc -b

# Format/lint frontend
cd frontend && pnpm check

# Run frontend dev
cd frontend && pnpm dev

# Run backend dev
cd backend && pnpm dev
```

## Performance Guidelines

- Code-split large features
- Memoize expensive computations
- Avoid unnecessary re-renders
- Debounce balance polling

## Specific Library Usage

### Tailwind CSS v4
- Use utility classes, not `@apply`
- Use `className` prop
- Reference Tailwind v4 docs for new syntax

### viem/wagmi
- Use wagmi hooks in React components
- Use viem directly for pure functions
- Public clients for read operations
- Wallet clients for write operations

### Express.js
- Use `res.status().json()` for JSON responses
- Use `express.json()` middleware to parse request body
- Set CORS headers via middleware or `res.setHeader()`
- Route via Express routing methods (`app.get()`, `app.post()`, etc.)

### Openfort SDK
- Client components: `@openfort/react`
- Server operations: `@openfort/openfort-node`
- Wrap app in `<OpenfortProviders>`

## Anti-Patterns to Avoid

❌ Importing UI components in integrations:
```typescript
// BAD: frontend/src/integrations/x402/helper.ts
import { Button } from '@/features/paywall/components/Button'
```

❌ Hardcoding configuration:
```typescript
// BAD
const USDC_ADDRESS = '0x...'
// GOOD
import { getUSDCAddress } from '@/integrations/x402/contracts'
```

❌ Using `any` unnecessarily:
```typescript
// BAD
function process(data: any) { }
// GOOD
function process(data: PaymentData) { }
```

❌ Mixing concerns:
```typescript
// BAD: backend/src/routes.ts
function PaymentUI() { return <div>...</div> }
```

## Architecture Overview

### Backend (`backend/`)
- **src/**: TypeScript source files
  - **server.ts**: Express server setup and middleware
  - **config.ts**: Environment configuration
  - **openfort.ts**: Openfort client initialization
  - **routes.ts**: HTTP endpoints (402 responses, Shield sessions, health)
  - **payment.ts**: Payment validation logic
- **dist/**: Compiled JavaScript output
- **package.json**: Backend dependencies

### Frontend (`frontend/`)
- **src/**: React application
  - **features/paywall/**: Complete paywall feature module
    - `PaywallExperience.tsx`: Main orchestrator
    - `components/`: UI components for each state
    - `hooks/`: Custom hooks for payment logic
    - `utils/`: Pure utility functions
  - **integrations/**: Protocol helpers (x402, Openfort)
  - **types/**: TypeScript ambient declarations
- **index.html**: App entry point
- **vite.config.ts**: Vite configuration
- **package.json**: Frontend dependencies

## Key Integration Points

### x402 Protocol
Custom implementation in `frontend/src/integrations/x402/`:
- `requirements.ts`: Parse and select payment requirements
- `payments.ts`: Encode payment proofs
- `balance.ts`: Check USDC balances
- `networks.ts`: Network configuration
- `contracts.ts`: Token addresses

### Openfort SDK
- Client: `@openfort/react` for React hooks and providers
- Server: `@openfort/openfort-node` for API operations
- Shield: Secure embedded wallet management

### Blockchain (viem/wagmi)
- viem: Low-level blockchain operations
- wagmi: React hooks for wallet connections
- Public clients: Transaction monitoring

## Common Workflows

### Payment Flow
1. Fetch x402 requirements from `/api/protected-content`
2. Authenticate user with Openfort
3. Activate wallet and check USDC balance
4. Send payment transaction on-chain
5. Monitor receipt for confirmation
6. Unlock content with payment proof

### Shield Session Flow
1. Client requests session from `/api/protected-create-encryption-session`
2. Server creates Openfort Shield session
3. Client uses session for wallet recovery
4. Wallet activated securely client-side

### Network Switching
1. Detect required network from x402 requirements
2. Prompt user to switch via wagmi
3. Update UI to show correct network status
4. Verify token address matches network

## Final Reminders

1. This is a DEMO/REFERENCE codebase - prioritize clarity and reusability
2. Follow existing patterns rather than inventing new ones
3. When unsure, ask rather than guessing
4. Read related code before making changes
5. Test manually in both base and base-sepolia
6. Keep the modular architecture intact

The goal is to maintain a codebase that others can easily understand, customize, and integrate into their own projects.
