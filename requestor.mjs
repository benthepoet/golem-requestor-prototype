import { TaskExecutor } from "@golem-sdk/task-executor";
import { pinoPrettyLogger } from "@golem-sdk/pino-logger";
import { OfferProposalFilterFactory } from "@golem-sdk/golem-js";

const whiteListNames = ["imperfect-lunchroom"];

(async () => {
  const executor = await TaskExecutor.create({
    logger: pinoPrettyLogger({ level: "info" }),
    api: { key: "03ced07404254a00ad00f52613060551" },
    // Optional: select payment network.
    // Testnets:  holesky (default), sepolia, rinkeby, amoy
    // Mainnets:  mainnet, polygon
    payment: { network: "hoodi" },
    demand: {
      workload: {
        imageTag: "golem/node:20-alpine",
      },
    },
    market: {
      rentHours: 1.0,
      pricing: {
        model: "linear",
        maxStartPrice: 1.0,
        maxCpuPerHourPrice: 100.0,
        maxEnvPerHourPrice: 5.0,
      },
      offerProposalFilter: OfferProposalFilterFactory.allowProvidersByName(whiteListNames),
    },
  });
  try {
    const result = await executor.run(async (exe) => {
      // Example using sleep in bash commands
      console.log("Starting long-running task...");
      
      // Sleep for 30 seconds then check node version
      let remoteProcess = await exe.runAndStream(`
        echo "Task started at $(date)"
        sleep 5s
        echo "After 5 second delay at $(date)"
        sleep 10s
        echo "After 10 second delay at $(date)"
        node -v
      `);
    
      remoteProcess.stderr.subscribe((data) => console.error("stderr: ", data));

      await new Promise((resolve) => {
        remoteProcess.stdout.subscribe({
          next: (data) => console.log("stdout: ", data),
          complete: () => resolve(),
        });
      });
    });
    console.log("Task result:", result);
  } catch (err) {
    console.error("An error occurred:", err);
  } finally {
    await executor.shutdown();
  }
})();