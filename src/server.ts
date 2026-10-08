import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { toolDefinitions } from "./schemas.js";
import { toolHandlers } from "./tools/index.js";
import { logger } from "./utils/logger.js";

export function createServer(): Server {
  const server = new Server(
    { name: "testlens", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: toolDefinitions.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = toolHandlers[name as keyof typeof toolHandlers];

    if (!handler) {
      return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
    }

    try {
      logger.info(`calling tool`, { name });
      const result = await handler(args ?? {});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`tool failed`, { name, message });
      return { isError: true, content: [{ type: "text", text: `Error running ${name}: ${message}` }] };
    }
  });

  return server;
}
