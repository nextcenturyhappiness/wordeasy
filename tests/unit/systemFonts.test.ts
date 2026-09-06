import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const tokensCss = readFileSync(join(root, "src/styles/tokens.css"), "utf8");
const globalCss = readFileSync(join(root, "src/styles/global.css"), "utf8");
const indexHtml = readFileSync(join(root, "index.html"), "utf8");

const remoteFontPattern =
  /fonts\.googleapis|fonts\.gstatic|use\.typekit|p\.typekit|adobe\.com\/[^"' \n]*font|fontshare\.com|cdn\.jsdelivr.*font|@import\s+|@font-face/iu;

function tokenStack(css: string, token: string): string[] {
  const match = css.match(new RegExp(`${token}:\\s*([^;]+);`, "u"));
  if (match?.[1] === undefined) {
    throw new Error(`Missing ${token} in tokens.css`);
  }

  return match[1].split(",").map((name) => name.trim().replaceAll(/^["']|["']$/gu, ""));
}

function indexOfFace(stack: string[], face: string): number {
  const index = stack.indexOf(face);
  if (index === -1) {
    throw new Error(`${face} is missing from the stack ${stack.join(", ")}`);
  }
  return index;
}

describe("PingFang-first local font stack", () => {
  it("lists CJK system faces before Segoe and Arial in --font-ui", () => {
    const stack = tokenStack(tokensCss, "--font-ui");

    expect(stack.slice(0, 4)).toEqual([
      "ui-sans-serif",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont"
    ]);
    expect(indexOfFace(stack, "PingFang SC")).toBeLessThan(indexOfFace(stack, "Segoe UI Variable"));
    expect(indexOfFace(stack, "PingFang SC")).toBeLessThan(indexOfFace(stack, "Segoe UI"));
    expect(indexOfFace(stack, "Hiragino Sans GB")).toBeLessThan(indexOfFace(stack, "Segoe UI"));
    expect(indexOfFace(stack, "Heiti SC")).toBeLessThan(indexOfFace(stack, "Arial"));
    expect(indexOfFace(stack, "Noto Sans SC")).toBeLessThan(indexOfFace(stack, "Arial"));
    expect(indexOfFace(stack, "Microsoft YaHei UI")).toBeLessThan(indexOfFace(stack, "Arial"));
    expect(indexOfFace(stack, "Microsoft YaHei")).toBeLessThan(indexOfFace(stack, "Arial"));
    expect(stack.at(-1)).toBe("sans-serif");
  });

  it("uses a CJK-first --font-zh stack for Chinese-marked UI", () => {
    const stack = tokenStack(tokensCss, "--font-zh");

    expect(stack[0]).toBe("PingFang SC");
    expect(indexOfFace(stack, "PingFang SC")).toBeLessThan(indexOfFace(stack, "ui-sans-serif"));
    expect(indexOfFace(stack, "Hiragino Sans GB")).toBeLessThan(indexOfFace(stack, "Segoe UI"));
    expect(indexOfFace(stack, "Microsoft YaHei")).toBeLessThan(indexOfFace(stack, "Arial"));
    expect(globalCss).toMatch(/:lang\(zh\)/);
    expect(globalCss).toMatch(/:lang\(zh-CN\)/);
    expect(globalCss).toMatch(/\[lang="zh-CN"\]/);
    expect(globalCss).toMatch(/font-family:\s*var\(--font-zh\)/);
    expect(globalCss).toMatch(
      /h1:lang\(zh\),\s*h2:lang\(zh\),\s*:lang\(zh\) h1,\s*:lang\(zh\) h2\s*\{\s*font-weight:\s*600;/u
    );
  });

  it("does not request remote or bundled web fonts", () => {
    for (const [label, source] of [
      ["tokens.css", tokensCss],
      ["global.css", globalCss],
      ["index.html", indexHtml]
    ] as const) {
      expect(source, label).not.toMatch(remoteFontPattern);
      expect(source, label).not.toMatch(/url\(\s*["']?https?:/iu);
    }
  });
});
