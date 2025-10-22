# Golem Requestor Prototype

This project demonstrates how to use the Golem Network JavaScript SDK to lease compute resources from decentralized providers on the Golem Network. It is configured for the Polygon Amoy testnet by default.

## Prerequisites

- Node.js v18 or newer
- npm (comes with Node.js)
- Testnet GLM tokens and MATIC (for gas) on Polygon Amoy (see below)

## Setup

1. **Clone the repository:**
   ```sh
   git clone <this-repo-url>
   cd golem-requestor-prototype
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure your API key and whitelist (optional):**
   - Edit `config/default.json` and set your `apiKey` and (optionally) `whiteListWalletAddresses`.

4. **Fund your Yagna wallet:**
   - Run the wallet info script (see below) to get your wallet address.
   - Get test MATIC from [Polygon Faucet](https://faucet.polygon.technology/).
   - Get test GLM (tGLM) from the Golem Discord or community faucet.

## Running the Requestor Script

```sh
node requestor.mjs
```

- The script will connect to the Golem Network, filter providers (if configured), and execute a sample task.
- By default, it will auto-cancel after 5 minutes (configurable in `requestor.mjs`).

## Customization

- **Change the testnet:**
  - In `requestor.mjs`, set `payment: { network: "amoy" }` for Polygon Amoy, or use `holesky` for Ethereum Holesky testnet.
- **Provider whitelisting:**
  - Add wallet addresses to `whiteListWalletAddresses` in `config/default.json`.

## Checking Your Wallet Address

You can add a script to print your Yagna wallet address:

```js
import { GolemNetwork } from "@golem-sdk/golem-js";
import { pinoPrettyLogger } from "@golem-sdk/pino-logger";

(async function getWalletInfo() {
  const glm = new GolemNetwork({
    logger: pinoPrettyLogger({ level: "info" }),
    api: { key: "<your-api-key>" },
    payment: { network: "amoy" },
  });
  await glm.connect();
  const accounts = await glm.yagna.payment.getAccounts();
  console.log(accounts);
  await glm.disconnect();
})();
```

## Troubleshooting

- **Agreements not signing:**
  - Make sure your `payment.network` matches the testnet you funded.
  - Ensure you have enough tGLM and MATIC for gas.
- **No providers found:**
  - Try increasing your pricing or running at a different time.
- **Timeouts:**
  - Adjust the timeout in `requestor.mjs` as needed.

## Resources

- [Golem Network Portal](https://portal.golem.network)
- [Golem SDK JS Docs](https://docs.golem.network/docs/requestor-tutorials/overview)
- [Polygon Faucet](https://faucet.polygon.technology/)
- [Golem Discord](https://discord.gg/golem)

---

**License:** MIT
