import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Theme-token regression guard for the ui/ primitives.
 *
 * The component classes reference Tailwind color utilities that resolve only
 * if the matching `--color-*` token exists in `app/globals.css`'s `@theme`
 * block. Whenever a ui/ component uses a color class for which Tailwind has
 * no token, the utility simply does not compile (no-op), so e.g. the Dialog
 * used to render with a transparent surface. This test fails fast instead:
 *
 *   1. every color utility found in a ui/ component must map to a `--color-*`
 *      token defined in the `@theme` block (or be an explicit Tailwind
 *      built-in color / non-color utility listed below);
 *   2. every `@theme` `--color-*` that references a bare CSS variable must
 *      resolve that variable in BOTH the light (`:root`) and the dark (`.dark`)
 *      theme, so the token is never a silent no-op in one theme.
 */

const UI_DIR = __dirname;
const GLOBALS_CSS = path.resolve(__dirname, "../../../app/globals.css");

/** Utilities that share the color-utility syntax but are NOT colors. */
const NON_COLOR_NAMES = new Set([
  // text-{size}
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
  // text-{align}
  "left",
  "right",
  "center",
  "start",
  "end",
  "justify",
  "balance",
  // border-{side}
  "t",
  "r",
  "b",
  "l",
  "s",
  "e",
  "x",
  "y",
  // background-clip / bg-repeat functional
  "clip-padding",
  "clip-text",
  "repeat",
  "no-repeat",
  "none",
  "nowrap",
  // Tailwind built-in colors (always compiled, never theme tokens)
  "current",
  "transparent",
  "black",
  "white",
  "inherit",
]);

/** Extract the `@theme { … }` block with brace-depth counting. */
function extractThemeBlock(css: string): string {
  const start = css.indexOf("@theme {");
  if (start === -1) throw new Error("no `@theme` block found in globals.css");
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error("unterminated `@theme` block in globals.css");
}

function extractBlock(css: string, open: string): string | null {
  const start = css.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return css.slice(start);
}

/** Parse `--name: value;` declarations inside a CSS block. */
function declarations(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

const globalsCss = fs.readFileSync(GLOBALS_CSS, "utf8");
const themeBlock = extractThemeBlock(globalsCss);
const themeDecls = declarations(themeBlock);
const themeColorTokens = new Map<string, string>();
for (const [name, value] of themeDecls) {
  if (name.startsWith("color-")) themeColorTokens.set(name.slice("color-".length), value);
}

/** Collect the color-utility names used by every (non-test) ui/ component. */
function componentColorNames(): Map<string, Set<string>> {
  const files = fs
    .readdirSync(UI_DIR)
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"));
  const byFile = new Map<string, Set<string>>();
  for (const file of files) {
    const src = fs.readFileSync(path.join(UI_DIR, file), "utf8");
    const names = new Set<string>();
    for (const m of src.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
      for (const tok of m[0].slice(1, -1).split(/\s+/)) {
        if (!tok) continue;
        const bare = tok.includes(":") ? tok.slice(tok.lastIndexOf(":") + 1) : tok;
        const match = bare.match(
          /^(bg|text|border|ring(?!-offset)|ring-offset|from|to|via|fill|stroke|outline)-([a-z][a-z0-9-]*)$/,
        );
        if (match) names.add(match[2]);
      }
    }
    byFile.set(file, names);
  }
  return byFile;
}

describe("theme tokens (app/globals.css @theme)", () => {
  it("defines a --color-* token for every color utility used by the ui/ components", () => {
    const missing: string[] = [];
    for (const [file, names] of componentColorNames()) {
      for (const name of names) {
        if (NON_COLOR_NAMES.has(name)) continue;
        if (!themeColorTokens.has(name)) missing.push(`${file}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("is dual: every --color-* that references a variable resolves it in :root and .dark", () => {
    const [rootBlock, darkBlock] = [extractBlock(globalsCss, ":root {"), extractBlock(globalsCss, ".dark {")];
    expect(rootBlock).not.toBeNull();
    expect(darkBlock).not.toBeNull();
    const root = declarations(rootBlock!);
    const dark = declarations(darkBlock!);
    const unresolved: string[] = [];
    for (const [name, value] of themeColorTokens) {
      const ref = value.match(/^var\(--([a-z0-9-]+)\)$/);
      if (!ref) continue; // literal value (no var to resolve)
      if (!root.has(ref[1]) || !dark.has(ref[1])) {
        unresolved.push(`color-${name} -> var(--${ref[1]})`);
      }
    }
    expect(unresolved).toEqual([]);
  });

  it("registers the FASE-1 semantic tokens introduced for the shadcn primitives", () => {
    for (const token of [
      "primary",
      "primary-foreground",
      "secondary",
      "secondary-foreground",
      "popover",
      "popover-foreground",
      "muted-foreground",
      "muted-bg",
      "destructive",
      "ring",
      "input",
    ]) {
      expect(themeColorTokens.has(token)).toBe(true);
      expect(themeColorTokens.get(token)).not.toBe("");
    }
  });
});