import { pinoPrettyLogger } from "@golem-sdk/pino-logger";
import { GolemNetwork } from "@golem-sdk/golem-js";

const whiteListWalletAddresses = [
  //"0x8b327753523dcad1d5eff3f8132e6d127d16f108"
  //"0x2f27061fc2e4f16d2f4cd99f93fbb653b46e2ecb"
  "0x819ab2601273ca539240189d252e2d6fb2e97d71"
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
    payment: { network: "amoy" },
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
              //version: "0.0.1",
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