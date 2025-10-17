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
  try {
    await glm.connect();

    const rental = await glm.oneOf({
      order: {
        demand: {
          workload: {
            //capabilities: ["!exp:gpu"],
            // runtime: {
            //   name: "test", // for now, at least
            //   version: "0.0.1",
            // },
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
    );
    
    remoteProcess.stdout
      .subscribe((data) => console.log("stdout>", data));

    remoteProcess.stderr
      .subscribe((data) => console.error("stderr>", data));

    await remoteProcess.waitForExit();
    await rental.stopAndFinalize();
  } catch (error) {
    console.error("Failed to execute work:", error);
  } finally {
    await glm.disconnect();
  }
})();

function filterByWalletAddress(whiteListWalletAddresses) {
  return (offerProposal) => {
    return whiteListWalletAddresses.includes(offerProposal.provider.walletAddress);
  }
}