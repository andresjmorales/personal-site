#!/usr/bin/env node
/**
 * Download Substack CDN images referenced by posts into public/writing/<slug>/
 * and rewrite the markdown to local paths.
 *
 * Usage:
 *   node scripts/localize-substack-images.mjs
 *   node scripts/localize-substack-images.mjs christianity-and-longtermism
 *   node scripts/localize-substack-images.mjs --dry-run
 *   npm run localize-images -- ai-and-abolition-of-man
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const PUBLIC_WRITING = path.join(ROOT, "public", "writing");

const IMAGE_URL_RE =
  /https?:\/\/(?:substackcdn\.com\/image\/fetch\/[^\s)"']+|substack-post-media\.s3\.amazonaws\.com\/[^\s)"']+)/gi;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const slugs = args.filter((a) => a !== "--dry-run");

function extFromUrlOrType(url, contentType) {
  try {
    const decoded = decodeURIComponent(url);
    const base = decoded.split("?")[0];
    const match = /\.(avif|jpe?g|png|gif|webp)$/i.exec(base);
    if (match) {
      const e = match[1].toLowerCase();
      return e === "jpeg" ? "jpg" : e;
    }
  } catch {
    /* ignore */
  }
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("avif")) return "avif";
  if (contentType?.includes("gif")) return "gif";
  return "jpg";
}

/** Prefer the UUID_WxH.ext basename inside Substack fetch URLs. */
function preferredBaseName(url) {
  try {
    const fetchIdx = url.indexOf("/fetch/");
    if (fetchIdx !== -1) {
      const after = url.slice(fetchIdx + "/fetch/".length);
      const slash = after.indexOf("/");
      const encoded = slash === -1 ? after : after.slice(slash + 1);
      const decoded = decodeURIComponent(encoded);
      const file = path.basename(decoded.split("?")[0]);
      if (file && file.includes(".")) {
        return file.replace(/\.jpeg$/i, ".jpg");
      }
    }
    const file = path.basename(new URL(url).pathname);
    if (file && file.includes(".")) {
      return file.replace(/\.jpeg$/i, ".jpg");
    }
  } catch {
    /* ignore */
  }
  return null;
}

function uniqueName(used, base) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const dot = base.lastIndexOf(".");
  const stem = dot === -1 ? base : base.slice(0, dot);
  const ext = dot === -1 ? "" : base.slice(dot);
  let n = 2;
  while (used.has(`${stem}-${n}${ext}`)) n += 1;
  const next = `${stem}-${n}${ext}`;
  used.add(next);
  return next;
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

async function download(url) {
  const res = await fetch(url, {
    headers: {
      // Some CDNs are picky without a UA.
      "User-Agent": "personal-site-localize-images/1.0",
      Accept: "image/*,*/*",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = extFromUrlOrType(url, res.headers.get("content-type"));
  return { buf, ext };
}

async function processPost(filename) {
  const slug = filename.replace(/\.mdx?$/, "");
  const mdPath = path.join(POSTS_DIR, filename);
  let markdown = await fs.readFile(mdPath, "utf8");
  const urls = [...new Set(markdown.match(IMAGE_URL_RE) || [])];

  if (urls.length === 0) {
    console.log(`· ${slug}: no Substack images`);
    return { slug, changed: false, count: 0 };
  }

  const outDir = path.join(PUBLIC_WRITING, slug);
  if (!dryRun) {
    await fs.mkdir(outDir, { recursive: true });
  }

  // Names assigned in this run only (same basename from two URLs → -2 suffix).
  // Re-runs overwrite the same UUID filenames on purpose.
  const usedNames = new Set();
  let changed = markdown;
  let downloaded = 0;

  for (const url of urls) {
    try {
      if (dryRun) {
        const preferred = preferredBaseName(url);
        const localName = uniqueName(
          usedNames,
          preferred || `image-${downloaded + 1}.jpg`
        );
        const localPath = `/writing/${slug}/${localName}`;
        changed = changed.split(url).join(localPath);
        console.log(`  [dry-run] ${url.slice(0, 72)}… → ${localPath}`);
        downloaded += 1;
        continue;
      }

      const { buf, ext } = await download(url);
      const preferred = preferredBaseName(url);
      let localName = preferred || `image-${downloaded + 1}.${ext}`;
      if (!/\.(avif|jpe?g|png|gif|webp)$/i.test(localName)) {
        localName = `${localName}.${ext}`;
      }
      localName = uniqueName(usedNames, localName);

      const diskPath = path.join(outDir, localName);
      await fs.writeFile(diskPath, buf);
      const localPath = `/writing/${slug}/${localName}`;
      changed = changed.split(url).join(localPath);
      console.log(`  ✓ ${localPath} (${buf.length} bytes)`);
      downloaded += 1;
    } catch (err) {
      console.error(`  ✗ ${url}\n    ${err instanceof Error ? err.message : err}`);
    }
  }

  if (!dryRun && changed !== markdown) {
    await fs.writeFile(mdPath, changed, "utf8");
  }

  console.log(
    `${dryRun ? "·" : "✓"} ${slug}: ${downloaded}/${urls.length} image(s)${
      dryRun ? " (dry-run)" : ""
    }`
  );
  return { slug, changed: changed !== markdown, count: downloaded };
}

async function main() {
  const files = await listPostFiles();
  if (files.length === 0) {
    console.error("No matching posts found.");
    process.exit(1);
  }

  console.log(
    dryRun
      ? "Dry run — no files will be written.\n"
      : "Localizing Substack images…\n"
  );

  let total = 0;
  for (const file of files) {
    const result = await processPost(file);
    total += result.count;
  }

  console.log(`\nDone. ${total} image(s) processed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
