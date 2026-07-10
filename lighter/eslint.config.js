// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // server/ is a separate Node/Express package with its own tooling (see AGENTS.md) — not
    // part of this Expo app's lint surface.
    ignores: ["dist/*", "server/**"],
  },
]);
