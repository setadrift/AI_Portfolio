const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  bull: "•",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
};

function decodeOnce(value: string) {
  return value
    .replace(/&#(x?[0-9a-f]+);/gi, (entity, encoded: string) => {
      const hexadecimal = encoded[0]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(hexadecimal ? encoded.slice(1) : encoded, hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    })
    .replace(/&([a-z]+);/gi, (entity, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? entity);
}

export function decodeHtmlEntities(value: string) {
  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decodeOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

export function plainDescription(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<\/(?:p|div|li|ul|ol|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((line) => decodeHtmlEntities(line).replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
