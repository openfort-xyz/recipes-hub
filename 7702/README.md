## Setup

Get your credentials:
- [Pimlico](https://dashboard.pimlico.io) - API key and sponsorship policy ID
- [Openfort](https://dashboard.openfort.io) - Publishable key, Shield key, and policy ID

```sh
pnpx gitpick openfort-xyz/recipes-hub/tree/main/7702 openfort-7702 && cd openfort-7702
pnpm i
cp .env.example .env
# Add your credentials to .env
pnpm dev
```