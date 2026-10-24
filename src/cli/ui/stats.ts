
import * as os from "node:os";
import { formatBytes, progressBar, theme, divider } from "./theme.js";

interface CpuSnapshot {
  idle: number;
  total: number;
}

function getCpuSnapshot(): CpuSnapshot {
  let idle = 0;
  let total = 0;

  for (const cpu of os.cpus()) {
    idle += cpu.times.idle;

    for (const time of Object.values(cpu.times)) {
      total += time;
    }
  }

  return { idle, total };
}

async function getCpuUsage(): Promise<number | null> {
  try {
    const before = getCpuSnapshot();

    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    const after = getCpuSnapshot();
    const totalDelta = after.total - before.total;
    const idleDelta = after.idle - before.idle;

    if (totalDelta <= 0) return null;

    return Math.max(
      0,
      Math.min(100, ((totalDelta - idleDelta) / totalDelta) * 100),
    );
  } catch {
    return null;
  }
}

export async function printStats(): Promise<void> {
  const cpuUsage = await getCpuUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = Math.max(0, totalMemory - freeMemory);
  const memoryPercent =
    totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0;

  const width = Math.max(
    24,
    Math.min(56, (process.stdout.columns || 80) - 4),
  );

  console.log();
  console.log(
    `  ${theme.brand("◆")} ${theme.text.bold("MYNA")} ${theme.muted("/ RESOURCE OVERVIEW")}`,
  );
  console.log(`  ${divider(width)}`);
  console.log();

  console.log(
    `  ${theme.muted("HOST")}  ${os.platform()} ${os.arch()} · ${os.cpus().length} logical CPU(s)`,
  );

  console.log();
  console.log(`  ${theme.text.bold("CPU USAGE")}`);

  if (cpuUsage === null) {
    console.log(`  ${theme.muted("Unavailable on this sample")}`);
  } else {
    console.log(
      `  ${progressBar(cpuUsage)}  ${theme.accent(`${cpuUsage.toFixed(1)}%`)}`,
    );
  }

  console.log();
  console.log(`  ${theme.text.bold("MEMORY")}`);
  console.log(
    `  ${progressBar(memoryPercent)}  ${theme.accent(`${memoryPercent.toFixed(1)}%`)}`,
  );
  console.log(
    `  ${theme.muted("Used")} ${formatBytes(usedMemory)} ${theme.muted("/")} ${formatBytes(totalMemory)}`,
  );
  console.log(
    `  ${theme.muted("Free")} ${formatBytes(freeMemory)}`,
  );

  console.log();
  console.log(
    `  ${theme.muted("Note: these are host metrics, not container-only metrics.")}`,
  );
  console.log();
}
