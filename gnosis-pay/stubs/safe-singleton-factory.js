// Static stub for @safe-global/safe-singleton-factory.
//
// The real package resolves its data with a *dynamic* require —
// `require(`../artifacts/${chainId}/deployment.json`)` — which Metro cannot bundle,
// so `getSingletonFactoryInfo()` returns `undefined` in the Hermes bundle. That breaks
// account-kit's bouncer prediction during card setup (`getCreate2Address(undefined, …)`
// → "invalid address null"). The singleton factory is deployed at the same deterministic
// address on every chain account-kit targets, so a constant is correct here. account-kit
// only reads `.address`. (See metro.config.js for the alias.)
const ADDRESS = "0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7";

function getSingletonFactoryInfo() {
  return { address: ADDRESS };
}

module.exports = { getSingletonFactoryInfo };
