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
  const abortController = new AbortController();
  
  // Set cancellation timeout (e.g., 30 seconds)
  const TIMEOUT_MS = 30000; // 30 seconds
  const cancelTimeout = setTimeout(() => {
    console.log(`⏰ Cancelling order after ${TIMEOUT_MS/1000} seconds...`);
    abortController.abort();
  }, TIMEOUT_MS);

  try {
    await glm.connect();

    const rental = await glm.oneOf({
      order: {
        demand: {
          workload: {
            runtime: {
              name: "test",
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
      signalOrTimeout: abortController.signal,
    });

    const exe = await rental.getExeUnit();
    const remoteProcess = await exe.runAndStream(
      `
      sleep 1
      echo -n 'Hello from stdout' >&1
      echo -n 'Hello from stderr' >&2
      sleep 1
      echo -n 'Hello from stdout again' >&1
      echo -n 'Hello from stderr again' >&2
      sleep 1
      echo -n 'Hello from stdout yet again' >&1
      echo -n 'Hello from stderr yet again' >&2
      `,
      {
        // Pass abort signal to the command execution
        signalOrTimeout: abortController.signal
      }
    );

    // Handle cancellation for remote process
    abortController.signal.addEventListener('abort', () => {
      console.log("🛑 Cancelling remote process...");
      remoteProcess.cancel();
    });
    
    remoteProcess.stdout
      .subscribe((data) => console.log("stdout>", data));

    remoteProcess.stderr
      .subscribe((data) => console.error("stderr>", data));

    await remoteProcess.waitForExit();
    await rental.stopAndFinalize();
  } catch (error) {
    if (abortController.signal.aborted) {
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