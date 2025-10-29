import config from "config";
import { pinoPrettyLogger } from "@golem-sdk/pino-logger";
import { GolemNetwork } from "@golem-sdk/golem-js";

let offerProposalFilter = null;

// Load whitelist wallet addresses from configuration
const whiteListWalletAddresses = config.get("whiteListWalletAddresses");
if (whiteListWalletAddresses.length > 0) {
  offerProposalFilter = filterByWalletAddress(whiteListWalletAddresses);
}

async function runOrder(orderId, glm, shutdown) {
  try {
    console.log(`🚀 Starting order ${orderId}...`);
    
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
            maxStartPrice: 10.0,
            maxCpuPerHourPrice: 10.0,
            maxEnvPerHourPrice: 10.0,
          },
          offerProposalFilter,
        },
      },
      // Pass abort signal to the rental
      signalOrTimeout: shutdown.signal,
    });

    console.log(`✅ Order ${orderId} connected to provider`);

    try {
      const exe = await rental.getExeUnit();
      const remoteProcess = await exe.runAndStream(
        'ef8876ed-509d-41e4-824c-62d558ed0027', 
        [JSON.stringify({ duration: 300 })], // Run for 300 seconds
        {
          // Pass abort signal to the command execution
          signalOrTimeout: shutdown.signal
        }
      );
      
      remoteProcess.stdout
        .subscribe((data) => console.log(`[Order ${orderId}] stdout>`, data));

      remoteProcess.stderr
        .subscribe((data) => console.error(`[Order ${orderId}] stderr>`, data));

      await remoteProcess.waitForExit(600 * 1000); // Wait up to 10 minutes for process to complete
      console.log(`✅ Order ${orderId} completed successfully`);
    } finally {
      await rental.stopAndFinalize();
      console.log(`🔄 Order ${orderId} finalized`);
    }
  } catch (error) {
    if (shutdown.signal.aborted) {
      console.log(`🛑 Order ${orderId} was cancelled due to timeout`);
    } else if (error.name === 'AbortError') {
      console.log(`🛑 Order ${orderId} was cancelled`);
    } else {
      console.error(`❌ Order ${orderId} failed:`, error);
    }
    throw error;
  }
}

(async function main() {
  const glm = new GolemNetwork({
    logger: pinoPrettyLogger({ level: "debug" }),
    api: { 
      key: config.get("apiKey")
    },
    payment: { 
      network: "hoodi"  // Polygon Amoy testnet
    },
  });

  // Create AbortController for cancellation
  const shutdown = new AbortController();

  // Set cancellation timeout (e.g., 5 minutes)
  const TIMEOUT_MS = 15 * 60 * 1000; // 5 minutes
  const cancelTimeout = setTimeout(() => {
    console.log(`⏰ Cancelling all orders after ${TIMEOUT_MS/1000} seconds...`);
    shutdown.abort();
  }, TIMEOUT_MS);

  try {
    await glm.connect();
    console.log("🔗 Connected to Golem Network");

    // Run two orders simultaneously
    console.log("🚀 Starting two orders in parallel...");
    const [result1, result2] = await Promise.allSettled([
      runOrder(1, glm, shutdown),
      runOrder(2, glm, shutdown)
    ]);

    // Check results
    if (result1.status === 'fulfilled') {
      console.log("✅ Order 1 completed successfully");
    } else {
      console.error("❌ Order 1 failed:", result1.reason?.message);
    }

    if (result2.status === 'fulfilled') {
      console.log("✅ Order 2 completed successfully");
    } else {
      console.error("❌ Order 2 failed:", result2.reason?.message);
    }

  } catch (error) {
    console.error("❌ Failed to execute orders:", error);
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