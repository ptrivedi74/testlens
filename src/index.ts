#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("TestLens MCP server started (stdio)");
}

main().catch((err) => {
  logger.error("Fatal error starting TestLens", { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
