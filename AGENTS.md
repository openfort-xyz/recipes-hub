# AGENTS.md

## Project overview
- Collection of Openfort integration samples (`aave`, `hyperliquid`, `lifi`, `morpho`, `usdc`).
- Each subdirectory has its own `AGENTS.md` with detailed setup instructions; start at the sample you are modifying.

## Setup commands
- `node -v` → ensure Node 18+.
- `cd <sample>` and run the install/start commands listed in that sample's `AGENTS.md`.
- Use `rg --files -g 'AGENTS.md'` to locate nested agent guides.

## Testing instructions
- Follow the sample-specific sections for lint or manual checks.
- For web + backend samples, run the frontend lint target and hit backend health routes manually.

## Code style
- Frontend web apps use Vite + TypeScript with ESLint or Next.js + TypeScript; keep hooks functional and avoid new global state.
- React Native apps follow Expo Router conventions and functional components.
- Backend services are Express with Node 18; keep async handlers tidy and leverage existing logging patterns.

## PR instructions
- Title format: `[sample-name] <summary>` (for example, `[aave] Update Shield policy ID`).
- Document environment variable changes in the relevant `README.md` and `AGENTS.md`.
- Verify lint/test steps for the touched sample before requesting review.
