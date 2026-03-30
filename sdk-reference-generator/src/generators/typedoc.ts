import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "../lib/log.js";
import { buildTypedocConfig } from "../lib/config.js";
import { CONSTANTS } from "../lib/constants.js";
import type { TypedocConfig } from "../types.js";

const GENERATED_CONFIG_NAME = "typedoc.generated.json";

// Resolve the generator's node_modules so typedoc can find its plugins
// even when running from the SDK directory's cwd.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatorRoot = path.resolve(__dirname, "../..");
const generatorNodeModules = path.join(generatorRoot, "node_modules");
const typedocBin = path.join(generatorNodeModules, ".bin/typedoc");

/**
 * Removes any existing typedoc config from the repo to prevent interference.
 */
async function cleanRepoConfigs(sdkDir: string): Promise<void> {
  const configFiles = ["typedoc.json", "typedoc.config.js", "typedoc.config.cjs"];

  for (const file of configFiles) {
    const filePath = path.join(sdkDir, file);
    if (await fs.pathExists(filePath)) {
      log.info(`Removing repo config: ${file}`, 1);
      await fs.remove(filePath);
    }
  }
}

export async function generateTypedoc(
  sdkDir: string,
  resolvedConfig: TypedocConfig,
  configsDir: string
): Promise<string> {
  // remove any existing repo configs to force our config
  await cleanRepoConfigs(sdkDir);

  // build full config with formatting defaults + SDK-specific settings
  const fullConfig = buildTypedocConfig(resolvedConfig);

  // write our generated config
  const configPath = path.join(sdkDir, GENERATED_CONFIG_NAME);
  await fs.writeJSON(configPath, fullConfig, { spaces: 2 });

  log.info("Running TypeDoc with generated config...", 1);
  log.data(`Entry points: ${resolvedConfig.entryPoints.join(", ")}`, 1);

  // Extend NODE_PATH so typedoc (running in SDK dir) can resolve plugins
  // from the generator's node_modules instead of the SDK's.
  const existingNodePath = process.env.NODE_PATH || "";
  const nodePath = existingNodePath
    ? `${generatorNodeModules}${path.delimiter}${existingNodePath}`
    : generatorNodeModules;

  await execa(
    typedocBin,
    [
      "--options",
      `./${GENERATED_CONFIG_NAME}`,
      "--plugin",
      "typedoc-plugin-markdown",
      "--plugin",
      path.join(configsDir, "typedoc-theme.cjs"),
    ],
    {
      cwd: sdkDir,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_PATH: nodePath,
      },
    }
  );

  return path.join(sdkDir, CONSTANTS.SDK_REF_DIR);
}
