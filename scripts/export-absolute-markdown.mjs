#!/usr/bin/env node
/**
 * Export posts with absolute URLs for images and self-links so they work when
 * pasted into Substack / BlogIDE or deployed elsewhere.
 *
 * Leaves source markdown untouched. Writes copies under output/ (or config).
 *
 * Usage:
 *   node scripts/export-absolute-markdown.mjs
 *   node scripts/export-absolute-markdown.mjs ai-and-abolition-of-man
 *   node scripts/export-absolute-markdown.mjs content/posts/god-and-science.md
 *   node scripts/export-absolute-markdown.mjs --preview
 *   node scripts/export-absolute-markdown.mjs --self-links=canonical
 *   npm run export-absolute -- christians-and-animals
 *
 * Config: scripts/export-absolute.config.json
 *   baseUrl     — site origin for /writing/… assets and (default) self-links
 *   outputDir   — folder for generated .md files (default: output)
 *   selfLinks   — "site" (baseUrl + /writing/slug) or "canonical" (frontmatter)
 *   pathMaps    — exact local-path → absolute URL overrides
 *                 e.g. { "/writing/foo/a.jpg": "https://cdn.example/a.jpg" }
 *
 * Note: prefer --preview over --dry-run; npm itself eats --dry-run.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const CONFIG_PATH = path.join(__dirname, "export-absolute.config.json");

/** Markdown image/link destinations that start with a site-relative /writing/ path. */
const MD_DEST_RE =
  /(!?\[[^\]]*\]\()(\/writing\/[^)\s]+)((?:\s+(?:"[^"]*"|'[^']*'))?\))/g;

/** HTML src/href with /writing/… (rare, but keep paste-safe). */
const HTML_ATTR_RE =
  /(\b(?:src|href)=["'])(\/writing\/[^"']+)(["'])/gi;

const args = process.argv.slice(2);
const dryRun = args.includes("--preview") || args.includes("--dry-run");
const selfLinksArg = args.find((a) => a.startsWith("--self-links="));
const selectors = args.filter(
  (a) =>
    a !== "--preview" &&
    a !== "--dry-run" &&
    !a.startsWith("--self-links=")
);

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, "");
}

/** Accept slug, filename, or path: god-and-science | god-and-science.md | content/posts/god-and-science.md */
function normalizeSelector(input) {
  const base = path.basename(input.replace(/\\/g, "/"));
  return base.replace(/\.mdx?$/i, "");
}

const slugs = selectors.map(normalizeSelector);

async function loadConfig() {
  let raw;
  try {
    raw = await fs.readFile(CONFIG_PATH, "utf8");
  } catch {
    console.warn(
      `⚠ No config at ${path.relative(ROOT, CONFIG_PATH)}; using defaults.`
    );
    return {
      baseUrl: "https://andresmorales.xyz",
      outputDir: "output",
      selfLinks: "site",
      pathMaps: {},
    };
  }
  const parsed = JSON.parse(raw);
  return {
    baseUrl: stripTrailingSlash(
      String(parsed.baseUrl || "https://andresmorales.xyz")
    ),
    outputDir: String(parsed.outputDir || "output"),
    selfLinks:
      parsed.selfLinks === "canonical" ? "canonical" : "site",
    pathMaps:
      parsed.pathMaps && typeof parsed.pathMaps === "object"
        ? parsed.pathMaps
        : {},
  };
}

function splitFrontmatter(raw) {
  if (!raw.startsWith("---")) {
    return { frontmatter: "", body: raw, canonical: null };
  }
  const end = raw.indexOf("\n---", 4);
  if (end === -1) {
    return { frontmatter: "", body: raw, canonical: null };
  }
  const fmBlock = raw.slice(0, end + 4);
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const fm = raw.slice(4, end);
  const match = /^canonical:\s*(.+)\s*$/m.exec(fm);
  const canonical = match
    ? match[1].trim().replace(/^["']|["']$/g, "")
    : null;
  return { frontmatter: fmBlock, body, canonical };
}

async function listPostFiles() {
  const names = await fs.readdir(POSTS_DIR);
  return names
    .filter(
      (n) =>
        n.toLowerCase() !== "readme.md" &&
        (n.endsWith(".md") || n.endsWith(".mdx"))
    )
    .filter((n) => {
      if (slugs.length === 0) return true;
      const slug = n.replace(/\.mdx?$/, "");
      return slugs.includes(slug);
    })
    .sort();
}

async function loadCanonicalBySlug() {
  const names = await fs.readdir(POSTS_DIR);
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const file of names) {
    if (
      file.toLowerCase() === "readme.md" ||
      !(file.endsWith(".md") || file.endsWith(".mdx"))
    ) {
      continue;
    }
    const slug = file.replace(/\.mdx?$/, "");
    const raw = await fs.readFile(path.join(POSTS_DIR, file), "utf8");
    const { canonical } = splitFrontmatter(raw);
    if (canonical) map.set(slug, stripTrailingSlash(canonical));
  }
  return map;
}

/**
 * Resolve a site-relative /writing/… path to an absolute URL.
 * Post self-links are `/writing/<slug>` (optional trailing slash).
 * Images / assets are `/writing/<slug>/file.ext`.
 */
function resolvePath(localPath, { baseUrl, selfLinks, pathMaps, canonicalBySlug }) {
  if (Object.prototype.hasOwnProperty.call(pathMaps, localPath)) {
    return { url: pathMaps[localPath], via: "pathMaps" };
  }

  const cleaned = localPath.replace(/\/$/, "") || localPath;
  const selfMatch = /^\/writing\/([a-z0-9-]+)$/i.exec(cleaned);
  if (selfMatch) {
    const slug = selfMatch[1];
    if (selfLinks === "canonical" && canonicalBySlug.has(slug)) {
      return { url: canonicalBySlug.get(slug), via: "canonical" };
    }
    return { url: `${baseUrl}${cleaned}`, via: "site" };
  }

  if (localPath.startsWith("/writing/")) {
    return { url: `${baseUrl}${localPath}`, via: "asset" };
  }

  return { url: localPath, via: "unchanged" };
}

function rewriteMarkdown(markdown, options) {
  /** @type {Map<string, { url: string, via: string, count: number }>} */
  const stats = new Map();

  const replaceDest = (prefix, localPath, suffix) => {
    const { url, via } = resolvePath(localPath, options);
    if (url === localPath) return `${prefix}${localPath}${suffix}`;

    const key = localPath;
    if (!stats.has(key)) stats.set(key, { url, via, count: 0 });
    stats.get(key).count += 1;

    return `${prefix}${url}${suffix}`;
  };

  let out = markdown.replace(MD_DEST_RE, (_m, prefix, localPath, suffix) =>
    replaceDest(prefix, localPath, suffix)
  );
  out = out.replace(HTML_ATTR_RE, (_m, prefix, localPath, suffix) =>
    replaceDest(prefix, localPath, suffix)
  );

  return { markdown: out, stats };
}

async function processPost(filename, options, outDir) {
  const slug = filename.replace(/\.mdx?$/, "");
  const mdPath = path.join(POSTS_DIR, filename);
  const raw = await fs.readFile(mdPath, "utf8");
  const { markdown, stats } = rewriteMarkdown(raw, options);

  if (stats.size === 0) {
    console.log(`· ${slug}: nothing to absolutize`);
    return { slug, count: 0, wrote: false };
  }

  let replacements = 0;
  for (const [local, row] of [...stats.entries()].sort()) {
    replacements += row.count;
    console.log(`  ${local}`);
    console.log(`    → ${row.url}`);
    console.log(`    via ${row.via} · ${row.count}×`);
  }

  const outPath = path.join(outDir, filename);
  if (!dryRun) {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, markdown, "utf8");
    console.log(`✓ ${slug} → ${path.relative(ROOT, outPath)} (${replacements} rewrite(s))`);
  } else {
    console.log(
      `· ${slug}: ${replacements} rewrite(s) (dry-run, would write ${path.relative(ROOT, outPath)})`
    );
  }

  return { slug, count: replacements, wrote: !dryRun };
}

async function main() {
  const config = await loadConfig();
  if (selfLinksArg) {
    const mode = selfLinksArg.split("=")[1];
    config.selfLinks = mode === "canonical" ? "canonical" : "site";
  }

  const files = await listPostFiles();
  if (files.length === 0) {
    console.error("No matching posts found.");
    process.exit(1);
  }

  const canonicalBySlug = await loadCanonicalBySlug();
  const outDir = path.resolve(ROOT, config.outputDir);
  const options = {
    baseUrl: config.baseUrl,
    selfLinks: config.selfLinks,
    pathMaps: config.pathMaps,
    canonicalBySlug,
  };

  console.log(
    dryRun
      ? "Dry run — no files will be written.\n"
      : `Exporting absolute-URL markdown → ${path.relative(ROOT, outDir)}/\n`
  );
  console.log(`baseUrl: ${config.baseUrl}`);
  console.log(`selfLinks: ${config.selfLinks}`);
  if (Object.keys(config.pathMaps).length) {
    console.log(`pathMaps: ${Object.keys(config.pathMaps).length} override(s)`);
  }
  console.log("");

  let total = 0;
  let wrote = 0;
  for (const file of files) {
    const result = await processPost(file, options, outDir);
    total += result.count;
    if (result.wrote) wrote += 1;
  }

  console.log(
    dryRun
      ? `\nDone (dry-run). ${total} rewrite(s) across ${files.length} post(s).`
      : `\nDone. ${wrote} file(s) written, ${total} rewrite(s).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
