#!/usr/bin/env node
/**
 * Find links to your own Substack posts and remap them to /writing/<slug>.
 *
 * Builds a map from each post's `canonical:` frontmatter (and fuzzy path
 * matching) so e.g.
 *   https://andresmorales.substack.com/p/how-should-christians-view-animals
 * → /writing/christians-and-animals
 *
 * Usage:
 *   node scripts/remap-substack-links.mjs              # report (dry-run)
 *   node scripts/remap-substack-links.mjs --apply      # write changes
 *   node scripts/remap-substack-links.mjs --apply --map ai-and-the-abolition-of-man=ai-and-abolition-of-man
 *
 * Other Substacks (christandcounterfactuals, etc.) are listed but not rewritten.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "content", "posts");

const OWN_HOST = "andresmorales.substack.com";
const LINK_RE =
  /https?:\/\/([a-z0-9-]+)\.substack\.com\/p\/([a-z0-9-]+)/gi;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const manualMaps = new Map();
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--map" && args[i + 1]) {
    const [from, to] = args[i + 1].split("=");
    if (from && to) manualMaps.set(from.toLowerCase(), to);
    i += 1;
  }
}

function normalizeTokens(slug) {
  return slug
    .toLowerCase()
    .split("-")
    .filter(
      (t) => t && !["the", "a", "an", "of", "and", "on", "in", "to"].includes(t)
    );
}

function tokenScore(a, b) {
  const ta = new Set(normalizeTokens(a));
  const tb = new Set(normalizeTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.max(ta.size, tb.size);
}

function splitFrontmatter(raw) {
  if (!raw.startsWith("---")) {
    return { frontmatter: "", body: raw, canonical: null };
  }
  const end = raw.indexOf("\n---", 4);
  if (end === -1) {
    return { frontmatter: "", body: raw, canonical: null };
  }
  const fmBlock = raw.slice(0, end + 4); // includes closing ---
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const fm = raw.slice(4, end);
  const match = /^canonical:\s*(.+)\s*$/m.exec(fm);
  const canonical = match
    ? match[1].trim().replace(/^["']|["']$/g, "")
    : null;
  return { frontmatter: fmBlock, body, canonical };
}

async function loadPosts() {
  const names = (await fs.readdir(POSTS_DIR)).filter(
    (n) =>
      n.toLowerCase() !== "readme.md" &&
      (n.endsWith(".md") || n.endsWith(".mdx"))
  );

  const posts = [];
  for (const file of names.sort()) {
    const slug = file.replace(/\.mdx?$/, "");
    const raw = await fs.readFile(path.join(POSTS_DIR, file), "utf8");
    const { frontmatter, body, canonical } = splitFrontmatter(raw);
    posts.push({ slug, file, canonical, frontmatter, body, raw });
  }
  return posts;
}

function buildMaps(posts) {
  const byCanonical = new Map();
  const bySubstackSlug = new Map();
  /** @type {Map<string, string>} canonical key → first owner slug */
  const canonicalOwner = new Map();

  for (const post of posts) {
    const local = `/writing/${post.slug}`;
    if (post.canonical) {
      try {
        const u = new URL(post.canonical);
        if (u.hostname === OWN_HOST) {
          const key = `${u.origin}${u.pathname}`.replace(/\/$/, "");
          const subSlug = u.pathname.replace(/^\/p\//, "").replace(/\/$/, "");
          const existing = canonicalOwner.get(key);
          if (existing && existing !== post.slug) {
            // Prefer the post whose local slug best matches the Substack path.
            const scoreNew = tokenScore(subSlug, post.slug);
            const scoreOld = tokenScore(subSlug, existing);
            console.warn(
              `⚠ duplicate canonical:\n  ${key}\n  claimed by "${existing}" and "${post.slug}" — keeping better slug match (scores ${scoreOld.toFixed(2)} vs ${scoreNew.toFixed(2)})`
            );
            if (scoreNew > scoreOld) {
              byCanonical.set(key, local);
              if (subSlug) bySubstackSlug.set(subSlug, local);
              canonicalOwner.set(key, post.slug);
            }
          } else {
            byCanonical.set(key, local);
            if (subSlug) bySubstackSlug.set(subSlug, local);
            canonicalOwner.set(key, post.slug);
          }
        }
      } catch {
        /* ignore */
      }
    }
    bySubstackSlug.set(post.slug, local);
  }

  for (const [from, to] of manualMaps) {
    bySubstackSlug.set(from, `/writing/${to}`);
  }

  return { byCanonical, bySubstackSlug, localSlugs: posts.map((p) => p.slug) };
}

function resolveOwnLink(url, maps) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { local: null, via: "bad-url" };
  }
  if (parsed.hostname !== OWN_HOST) {
    return { local: null, via: `other-substack(${parsed.hostname.split(".")[0]})` };
  }

  const canonKey = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  if (maps.byCanonical.has(canonKey)) {
    return { local: maps.byCanonical.get(canonKey), via: "canonical" };
  }

  const subSlug = parsed.pathname.replace(/^\/p\//, "").replace(/\/$/, "");
  if (maps.bySubstackSlug.has(subSlug)) {
    return { local: maps.bySubstackSlug.get(subSlug), via: "slug-map" };
  }

  let best = null;
  let bestScore = 0;
  let tie = false;
  for (const localSlug of maps.localSlugs) {
    const score = tokenScore(subSlug, localSlug);
    if (score > bestScore) {
      bestScore = score;
      best = localSlug;
      tie = false;
    } else if (score === bestScore && score > 0) {
      tie = true;
    }
  }
  if (best && bestScore >= 0.6 && !tie) {
    return {
      local: `/writing/${best}`,
      via: `fuzzy(${bestScore.toFixed(2)})`,
    };
  }

  return {
    local: null,
    via: "unmatched",
    subSlug,
    suggestions: maps.localSlugs
      .map((s) => ({ s, score: tokenScore(subSlug, s) }))
      .filter((x) => x.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
  };
}

async function main() {
  const posts = await loadPosts();
  const maps = buildMaps(posts);

  console.log(
    apply
      ? "Applying Substack → local link remaps…\n"
      : "Dry run (pass --apply to write).\n"
  );

  /** @type {Map<string, any>} */
  const summary = new Map();
  let fileWrites = 0;
  let linkReplacements = 0;

  for (const post of posts) {
    // Only remap in the body — never rewrite frontmatter `canonical:`.
    let body = post.body;
    const seenInFile = new Set();

    for (const match of post.body.matchAll(LINK_RE)) {
      const url = match[0];
      const host = match[1];
      const key = url.replace(/\/$/, "");

      if (host !== "andresmorales") {
        if (!summary.has(key)) {
          summary.set(key, {
            local: null,
            via: `other-substack(${host})`,
            count: 0,
            files: new Set(),
          });
        }
        const row = summary.get(key);
        row.count += 1;
        row.files.add(post.slug);
        continue;
      }

      const resolved = resolveOwnLink(url, maps);
      if (!summary.has(key)) {
        summary.set(key, {
          local: resolved.local,
          via: resolved.via,
          count: 0,
          files: new Set(),
          suggestions: resolved.suggestions,
          subSlug: resolved.subSlug,
        });
      }
      const row = summary.get(key);
      row.count += 1;
      row.files.add(post.slug);

      if (apply && resolved.local && !seenInFile.has(key)) {
        seenInFile.add(key);
        const before = body;
        body = body.split(`${key}/`).join(resolved.local);
        body = body.split(key).join(resolved.local);
        if (body !== before) {
          const occurrences = before.split(key).length - 1;
          linkReplacements += Math.max(1, occurrences);
        }
      }
    }

    if (apply && body !== post.body) {
      const next = `${post.frontmatter}\n${body}`;
      await fs.writeFile(path.join(POSTS_DIR, post.file), next, "utf8");
      console.log(`✓ wrote ${post.file}`);
      fileWrites += 1;
    }
  }

  console.log("Own Substack links (andresmorales.substack.com):\n");
  for (const [url, row] of [...summary.entries()].sort()) {
    if (row.via.startsWith("other-substack")) continue;
    const files = [...row.files].join(", ");
    if (row.local) {
      console.log(`  ${row.local}`);
      console.log(`    ← ${url}`);
      console.log(`    via ${row.via} · ${row.count}× in ${files}`);
    } else {
      console.log(`  ??? unmatched`);
      console.log(`    ← ${url}`);
      console.log(`    ${row.count}× in ${files}`);
      if (row.suggestions?.length) {
        console.log(
          `    try: ${row.suggestions
            .map((x) => `${x.s} (${x.score.toFixed(2)})`)
            .join(", ")}`
        );
      }
      const slug = row.subSlug || url.split("/p/")[1];
      console.log(`    or:  --map ${slug}=<local-slug>`);
    }
    console.log("");
  }

  const others = [...summary.entries()].filter(([, r]) =>
    r.via.startsWith("other-substack")
  );
  if (others.length) {
    console.log("Other Substacks (left unchanged):\n");
    for (const [url, row] of others) {
      console.log(`  ${url}`);
      console.log(
        `    ${row.count}× in ${[...row.files].join(", ")} · ${row.via}`
      );
      console.log("");
    }
  }

  if (apply) {
    console.log(
      `Done. ${fileWrites} file(s) updated, ~${linkReplacements} link(s) remapped.`
    );
  } else {
    const auto = [...summary.values()].filter((r) => r.local).length;
    const miss = [...summary.values()].filter(
      (r) => !r.local && !r.via.startsWith("other-substack")
    ).length;
    console.log(
      `Dry run: ${auto} URL(s) ready to remap, ${miss} unmatched. Re-run with --apply.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
