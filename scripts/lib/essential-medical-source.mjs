import { readdir, readFile, writeFile } from "node:fs/promises";

const PLACEHOLDER_PATTERN = /PLACEHOLDER|file:\/\/|SOURCE_CONTENT_FOR_MCP/iu;
const PART_NAME = /^source\.part([1-5])\.txt$/u;

export function isPlaceholderSource(text) {
  const trimmed = text.trim();
  return trimmed.length < 80 || PLACEHOLDER_PATTERN.test(trimmed);
}

export function normalizeLemmaKey(value) {
  return value.normalize("NFKC").toLowerCase().replace(/\\+/gu, " ").replace(/\s+/gu, " ").trim();
}

function toDirUrl(dataDir) {
  if (dataDir instanceof URL) {
    return dataDir;
  }
  const path = String(dataDir);
  return path.endsWith("/") ? new URL(`file://${path}`) : new URL(`file://${path}/`);
}

export async function assembleEssentialSource(dataDir, { write = false } = {}) {
  const dirUrl = toDirUrl(dataDir);
  const sourceUrl = new URL("source.txt", dirUrl);
  const sourceText = await readFile(sourceUrl, "utf8").catch(() => "");

  const names = await readdir(dirUrl);
  const partFiles = names
    .map((name) => {
      const match = PART_NAME.exec(name);
      return match ? { name, index: Number(match[1]) } : null;
    })
    .filter((entry) => entry !== null)
    .sort((left, right) => left.index - right.index);

  const parts = [];
  for (const { name } of partFiles) {
    const text = await readFile(new URL(name, dirUrl), "utf8");
    if (!isPlaceholderSource(text)) {
      parts.push(text.replaceAll("\f", "\n").trimEnd());
    }
  }

  if (!isPlaceholderSource(sourceText)) {
    return { text: sourceText, assembledFromParts: false, wrote: false };
  }

  if (parts.length === 0) {
    return { text: sourceText, assembledFromParts: false, wrote: false };
  }

  const assembled = `${parts.join("\n")}\n`;
  if (write) {
    await writeFile(sourceUrl, assembled, "utf8");
  }
  return { text: assembled, assembledFromParts: true, wrote: write };
}

export function parseSourceGlosses(sourceText) {
  const glosses = new Map();
  if (isPlaceholderSource(sourceText)) {
    return glosses;
  }

  const pattern = new RegExp(
    String.raw`(?:^|[;\n]|\d+\.)\s*([A-Za-z][A-Za-z0-9' \-/\\]*)\s*(/[^/\n]+/)?\s*[（(]([^）)\n]+)[）)]`,
    "gu"
  );
  for (const match of sourceText.matchAll(pattern)) {
    const lemma = match[1].trim().replace(/\s+/gu, " ");
    if (lemma.length < 2) {
      continue;
    }
    const ipa = match[2]?.trim() ?? "";
    const zh = match[3].trim();
    if (zh.length === 0) {
      continue;
    }
    const record = { lemma, ipa, zh };
    const key = normalizeLemmaKey(lemma);
    const current = glosses.get(key) ?? record;
    if (ipa.length > 0) {
      current.ipa = ipa;
    }
    current.zh = zh;
    glosses.set(key, current);
    for (const piece of lemma.split(/\s*[/\\]\s*/u)) {
      const pieceKey = normalizeLemmaKey(piece);
      if (pieceKey.length > 0 && !glosses.has(pieceKey)) {
        glosses.set(pieceKey, { lemma: piece.trim(), ipa: current.ipa, zh });
      }
    }
  }
  return glosses;
}
