// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// @gnosispay/account-kit imports node's "assert"; map it to the npm shim so Metro can bundle it.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  assert: require.resolve("assert"),
};

const path = require("path");

const resolveRequestWithPackageExports = (context, moduleName, platform) => {
  // @safe-global/safe-singleton-factory uses a dynamic require for its per-chain JSON,
  // which Metro can't bundle → getSingletonFactoryInfo() returns undefined and breaks
  // account-kit's setup. Alias it to a static stub. See stubs/safe-singleton-factory.js.
  if (moduleName === "@safe-global/safe-singleton-factory") {
    return { type: "sourceFile", filePath: path.resolve(__dirname, "stubs/safe-singleton-factory.js") };
  }

  // Package exports in `jose` are incorrect, so we need to force the browser version
  if (moduleName === "jose") {
    const ctx = {
      ...context,
      unstable_conditionNames: ["browser"],
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  // @noble/hashes@1.3.2 self-imports "@noble/hashes/crypto.js", a subpath missing
  // from its exports map. Resolve it by file path (exports off) to avoid the warning.
  if (moduleName.startsWith("@noble/hashes/")) {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.resolveRequest = resolveRequestWithPackageExports;

module.exports = config;
