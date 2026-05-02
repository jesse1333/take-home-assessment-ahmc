export function formatBullets(lines: unknown) {
  if (Array.isArray(lines)) {
    return lines.map((line) => `• ${String(line)}`).join("\n");
  }
  if (typeof lines === "string") {
    return lines;
  }
  return "";
}

export function parseBullets(block: string) {
  return block
    .split("\n")
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}
