/**
 * MCP servers over stdio use stdout exclusively for protocol messages.
 * Any logging must go to stderr or it will corrupt the MCP stream.
 */
export const logger = {
  info: (msg: string, meta?: unknown) => process.stderr.write(`[testlens] ${msg} ${meta ? JSON.stringify(meta) : ""}\n`),
  warn: (msg: string, meta?: unknown) => process.stderr.write(`[testlens:warn] ${msg} ${meta ? JSON.stringify(meta) : ""}\n`),
  error: (msg: string, meta?: unknown) => process.stderr.write(`[testlens:error] ${msg} ${meta ? JSON.stringify(meta) : ""}\n`)
};
