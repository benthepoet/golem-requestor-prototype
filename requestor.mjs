import config from "config";
import { pinoPrettyLogger } from "@golem-sdk/pino-logger";
import { GolemNetwork } from "@golem-sdk/golem-js";

let offerProposalFilter = null;

// Load whitelist wallet addresses from configuration
const whiteListWalletAddresses = config.get("whiteListWalletAddresses");
if (whiteListWalletAddresses.length > 0) {
  offerProposalFilter = filterByWalletAddress(whiteListWalletAddresses);
}

(async function main() {
  const glm = new GolemNetwork({
    logger: pinoPrettyLogger({ level: "debug" }),
    api: { 
      key: config.get("apiKey")
    },
    payment: { 
      network: "amoy"  // Polygon Amoy testnet
    },
  });

  // Create AbortController for cancellation
  const shutdown = new AbortController();

  // Set cancellation timeout (e.g., 5 minutes)
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const cancelTimeout = setTimeout(() => {
    console.log(`⏰ Cancelling order after ${TIMEOUT_MS/1000} seconds...`);
    shutdown.abort();
  }, TIMEOUT_MS);

  try {
    await glm.connect();

    const rental = await glm.oneOf({
      order: {
        demand: {
          workload: {
            runtime: {
              name: "salad",
            },
            imageTag: "golem/alpine:latest",
          },
        },
        // You have to be now explicit about about your terms and expectations from the market
        market: {
          rentHours: 2,
          pricing: {
            model: "linear",
            maxStartPrice: 1.0,
            maxCpuPerHourPrice: 10.0,
            maxEnvPerHourPrice: 5.0,
          },
          offerProposalFilter,
        },
      },
      // Pass abort signal to the rental
      signalOrTimeout: shutdown.signal,
    });

    try {
      const exe = await rental.getExeUnit();
      const remoteProcess = await exe.runAndStream(
        'ef8876ed-509d-41e4-824c-62d558ed0027', 
        [JSON.stringify({ duration: 120 })], // Run for 120 seconds
        {
          // Pass abort signal to the command execution
          signalOrTimeout: shutdown.signal
        }
      );
      
      remoteProcess.stdout
        .subscribe((data) => console.log("stdout>", data));

      remoteProcess.stderr
        .subscribe((data) => console.error("stderr>", data));

      await remoteProcess.waitForExit();
    } finally {
      await rental.stopAndFinalize();
    }
  } catch (error) {
    if (shutdown.signal.aborted) {
      console.log("🛑 Order was cancelled due to timeout");
    } else if (error.name === 'AbortError') {
      console.log("🛑 Order was cancelled");
    } else {
      console.error("❌ Failed to execute work:", error);
    }
  } finally {
    clearTimeout(cancelTimeout);
    await glm.disconnect();
    console.log("🔄 Disconnected from Golem Network");
  }
})();

function filterByWalletAddress(whiteListWalletAddresses) {
  return (offerProposal) => {
    return whiteListWalletAddresses.includes(offerProposal.provider.walletAddress);
  }
}