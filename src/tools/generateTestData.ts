import type { GenerateTestDataInput, GenerateTestDataOutput } from "../types.js";

/**
 * Tiny deterministic PRNG (mulberry32) so `seed` produces reproducible output
 * without pulling in an external dependency. Swap for @faker-js/faker if you
 * need richer, more realistic strings (names, addresses) later — the schema
 * walker below is the only part that would need to change.
 */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = ["alpha", "beta", "gamma", "delta", "orbit", "river", "cobalt", "ember", "quartz", "nova", "cedar", "lumen"];

function sample<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function randomString(rnd: () => number, format?: string): string {
  if (format === "email") return `${sample(rnd, WORDS)}.${sample(rnd, WORDS)}${Math.floor(rnd() * 100)}@example.com`;
  if (format === "date") {
    const d = new Date(2024, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28));
    return d.toISOString().slice(0, 10);
  }
  if (format === "date-time") return new Date(Date.now() - Math.floor(rnd() * 1e10)).toISOString();
  if (format === "uuid") {
    const hex = () => Math.floor(rnd() * 16).toString(16);
    return `${"x".repeat(8)}-${"x".repeat(4)}-4${"x".repeat(3)}-${"89ab"[Math.floor(rnd() * 4)]}${"x".repeat(3)}-${"x".repeat(12)}`.replace(/x/g, hex);
  }
  return `${sample(rnd, WORDS)}-${sample(rnd, WORDS)}-${Math.floor(rnd() * 1000)}`;
}

function generateFromSchema(schema: Record<string, unknown>, rnd: () => number): unknown {
  if (Array.isArray(schema.enum) && schema.enum.length) return sample(rnd, schema.enum as unknown[]);

  const type = (schema.type as string) ?? "string";

  switch (type) {
    case "string":
      return randomString(rnd, schema.format as string | undefined);
    case "number":
      return Math.round(rnd() * ((schema.maximum as number) ?? 1000) * 100) / 100;
    case "integer":
      return Math.floor(rnd() * (((schema.maximum as number) ?? 1000) + 1));
    case "boolean":
      return rnd() > 0.5;
    case "array": {
      const items = (schema.items as Record<string, unknown>) ?? { type: "string" };
      const len = 1 + Math.floor(rnd() * 3);
      return Array.from({ length: len }, () => generateFromSchema(items, rnd));
    }
    case "object": {
      const props = (schema.properties as Record<string, Record<string, unknown>>) ?? {};
      const out: Record<string, unknown> = {};
      for (const [key, subSchema] of Object.entries(props)) {
        out[key] = generateFromSchema(subSchema, rnd);
      }
      return out;
    }
    default:
      return null;
  }
}

export async function generateTestData(input: GenerateTestDataInput): Promise<GenerateTestDataOutput> {
  const count = input.count ?? 5;
  const rnd = mulberry32(input.seed ?? Date.now() % 2147483647);

  const records: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const record = generateFromSchema(input.schema, rnd);
    records.push(record as Record<string, unknown>);
  }
  return { records };
}
