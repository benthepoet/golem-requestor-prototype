import { pinoPrettyLogger } from "@golem-sdk/pino-logger";
import { GolemNetwork } from "@golem-sdk/golem-js";

const whiteListWalletAddresses = [
  "0x71be8a8b65ded3549305da4c8f4cf9eceb17e647"
];

function filterByWalletAddress(whiteListWalletAddresses) {
  return (offerProposal) => {
    return whiteListWalletAddresses.includes(offerProposal.provider.walletAddress);
  }
}

(async function main() {
  const glm = new GolemNetwork({
    logger: pinoPrettyLogger({ level: "debug" }),
    api: { key: "eb9d0e5f5f144a7a8267c715af5d3300" },
    payment: { network: "hoodi" },
  });
  try {
    await glm.connect();

    const rental = await glm.oneOf({
      order: {
        demand: {
          
          workload: {
            //capabilities: ["!exp:gpu"],
            runtime: {
              name: "test", // for now, at least
              version: "0.0.1",
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
          offerProposalFilter: filterByWalletAddress(whiteListWalletAddresses),
        },
      },
    });

    // You will work with exe-unit objects instead of "executor"
    await rental
      .getExeUnit()
      .then((exe) => exe.run("echo 'Hello World'"))
      .then((res) => console.log(res.stdout));

  } catch (error) {
    console.error("Failed to execute work:", error);
  } finally {
    await glm.disconnect();
  }
})();