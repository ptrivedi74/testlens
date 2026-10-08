import { readFile, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import type { VisualDiffInput, VisualDiffOutput } from "../types.js";

export async function visualDiff(input: VisualDiffInput): Promise<VisualDiffOutput> {
  const threshold = input.threshold ?? 0.01;

  const [baselineBuf, candidateBuf] = await Promise.all([readFile(input.baselinePath), readFile(input.candidatePath)]);
  const baseline = PNG.sync.read(baselineBuf);
  const candidate = PNG.sync.read(candidateBuf);

  if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
    throw new Error(
      `Image dimensions differ: baseline ${baseline.width}x${baseline.height} vs candidate ${candidate.width}x${candidate.height}. ` +
        `Resize/crop to match before diffing, or the comparison is meaningless.`
    );
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const diffPixelCount = pixelmatch(baseline.data, candidate.data, diff.data, width, height, { threshold: 0.1 });
  const diffRatio = diffPixelCount / (width * height);
  const passed = diffRatio <= threshold;

  let diffImagePath: string | undefined;
  if (input.diffOutputPath) {
    await writeFile(input.diffOutputPath, PNG.sync.write(diff));
    diffImagePath = input.diffOutputPath;
  }

  return { width, height, diffPixelCount, diffRatio: Number(diffRatio.toFixed(5)), passed, diffImagePath };
}
