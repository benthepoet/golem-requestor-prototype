import { TaskExecutor } from "@golem-sdk/task-executor";
import { pinoPrettyLogger } from "@golem-sdk/pino-logger";
import { GolemNetwork, OfferProposalFilterFactory } from "@golem-sdk/golem-js";

const whiteListIds = ["0x2f27061fc2e4f16d2f4cd99f93fbb653b46e2ecb"];

(async function main() {
  const glm = new GolemNetwork({
    logger: pinoPrettyLogger({ level: "info" }),
    api: { key: "03ced07404254a00ad00f52613060551" },
    // Optional: select payment network.
    // Testnets:  holesky (default), sepolia, rinkeby, amoy
    // Mainnets:  mainnet, polygon
    payment: { network: "hoodi" },
  });
  try {
    await glm.connect();

    const rental = await glm.oneOf({
      order: {
        demand: {
          workload: { imageTag: "golem/alpine:latest" },
        },
        // You have to be now explicit about about your terms and expectations from the market
        market: {
          rentHours: 15 / 60,
          pricing: {
            model: "linear",
            maxStartPrice: 1.0,
            maxCpuPerHourPrice: 10.0,
            maxEnvPerHourPrice: 5.0,
          },
          //offerProposalFilter: OfferProposalFilterFactory.allowProvidersById(whiteListIds),
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