/* Ad-hoc verification of the account-kit wiring (run with `node scripts/verify-accountkit.cjs`).
 * Not part of the app bundle — it validates address prediction, the EIP-712 domain
 * ordering used by lib/eip1193.ts, and a live accountQuery against Gnosis mainnet. */
const {
  predictAccountAddress,
  predictAddresses,
  populateAccountCreation,
  populateAccountSetup,
  accountQuery,
  AccountIntegrityStatus,
} = require("@gnosispay/account-kit");
const {
  Wallet,
  JsonRpcProvider,
  TypedDataEncoder,
  verifyTypedData,
  keccak256,
  toUtf8Bytes,
  AbiCoder,
  Interface,
  parseUnits,
} = require("ethers");

const GNOSIS_CHAIN_ID = 100;
const EURE = "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430";

// Mirror of lib/eip1193.ts domainTypes() — the one risky bit for eth_signTypedData_v4.
const DOMAIN_FIELDS = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
  { name: "salt", type: "bytes32" },
];
function domainTypes(domain) {
  return DOMAIN_FIELDS.filter((f) => domain[f.name] !== undefined);
}
function myDomainSeparator(domain) {
  const fields = domainTypes(domain);
  const typehash = keccak256(
    toUtf8Bytes(`EIP712Domain(${fields.map((f) => `${f.type} ${f.name}`).join(",")})`)
  );
  const types = ["bytes32", ...fields.map((f) => (f.type === "uint256" ? "uint256" : f.type === "address" ? "address" : "bytes32"))];
  const values = [typehash, ...fields.map((f) => (f.type === "uint256" ? domain[f.name] : domain[f.name]))];
  // hash dynamic strings — but Safe domain has none, so only chainId/verifyingContract here.
  return keccak256(AbiCoder.defaultAbiCoder().encode(types, values));
}

async function main() {
  let pass = 0;
  const assert = (cond, msg) => {
    if (!cond) throw new Error("FAIL: " + msg);
    pass++;
    console.log("  ✓ " + msg);
  };

  const owner = new Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log("owner:", owner.address);

  // 1. Address prediction is deterministic + valid.
  const account = predictAccountAddress({ owner: owner.address });
  assert(/^0x[0-9a-fA-F]{40}$/.test(account), `predicted account address: ${account}`);
  assert(predictAccountAddress({ owner: owner.address }) === account, "prediction is deterministic");

  // 2. Creation tx is well-formed.
  const createTx = populateAccountCreation({ owner: owner.address });
  assert(createTx.to && createTx.data?.startsWith("0x"), "populateAccountCreation returns {to,data}");

  // 3. Setup typed data is signable AND my EIP712Domain ordering matches ethers'.
  let captured;
  const setupTx = await populateAccountSetup(
    { account, owner: owner.address, chainId: GNOSIS_CHAIN_ID, nonce: 0 },
    {
      spender: owner.address,
      receiver: owner.address,
      token: EURE,
      allowance: { period: 86400, refill: parseUnits("100", 18) },
      delay: { cooldown: 180, expiration: 0 },
    },
    async ({ domain, types, message }) => {
      captured = { domain, types, message };
      return owner.signTypedData(domain, types, message);
    }
  );
  assert(setupTx.to === account && setupTx.data.startsWith("0x"), "populateAccountSetup returns exec tx to the account");

  const { domain, types, message } = captured;
  const sig = await owner.signTypedData(domain, types, message);
  assert(verifyTypedData(domain, types, message, sig) === owner.address, "owner EOA signature recovers (account-kit typed data is valid)");
  assert(myDomainSeparator(domain) === TypedDataEncoder.hashDomain(domain), "lib/eip1193 EIP712Domain ordering matches ethers (eth_signTypedData_v4 will hash correctly)");

  // 4. Live against Gnosis mainnet: an unseen owner's account has no code yet, which
  //    is how lib/gnosisPay detects the "not-created" stage. (accountQuery alone can't:
  //    EVM calls to an empty address succeed with no data, so it returns UnexpectedError.)
  const provider = new JsonRpcProvider("https://rpc.gnosischain.com", GNOSIS_CHAIN_ID, { staticNetwork: true });
  const code = await provider.getCode(account);
  assert(code === "0x", "undeployed account has no code (drives the 'not-created' stage)");
  const result = await accountQuery({ account, cooldown: 180 }, (req) => provider.call({ to: req.to, data: req.data }));
  assert(
    result.status === AccountIntegrityStatus.UnexpectedError,
    `accountQuery is unreliable pre-deploy — hence the getCode gate (got ${AccountIntegrityStatus[result.status]})`
  );

  // 5. Direct spend (no second Safe): the owner calls the account's Roles module.
  const rolesIface = new Interface([
    "function execTransactionWithRole(address to, uint256 value, bytes data, uint8 operation, bytes32 roleKey, bool shouldRevert) returns (bool)",
  ]);
  const transferIface = new Interface(["function transfer(address to, uint256 amount) returns (bool)"]);
  const roles = predictAddresses(account).roles;
  assert(/^0x[0-9a-fA-F]{40}$/.test(roles), `roles module address derived: ${roles}`);
  const spendData = rolesIface.encodeFunctionData("execTransactionWithRole", [
    EURE,
    0,
    transferIface.encodeFunctionData("transfer", [owner.address, parseUnits("1", 18)]),
    0,
    keccak256(toUtf8Bytes("SPENDING_ROLE")),
    true,
  ]);
  assert(spendData.startsWith("0xc6fe8747"), "spend encodes execTransactionWithRole (no Spender Safe needed)");

  console.log(`\nAll ${pass} checks passed.`);
}

main().catch((e) => {
  console.error("\n" + e.message);
  process.exit(1);
});
