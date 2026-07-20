# personal-site

My site. Next.js.

## Run locally

```bash
npm install
npm run dev
```

Defaults to http://localhost:3000. If something else is already on 3000:

```bash
npx next dev --port 3001
```

## Content

- **Writing:** drop markdown in `content/posts/`. See [content/posts/README.md](./content/posts/README.md).
- **Projects:** edit the `projects` array in `src/lib/content.ts` (optional image under `public/projects/`).

### Localize Substack images

After pasting an essay that still points at `substackcdn.com`, download images into the repo and rewrite the markdown:

```bash
npm run localize-images -- <slug>
# or all posts:
npm run localize-images
npm run localize-images -- --dry-run
```

Files land in `public/writing/<slug>/`; markdown becomes `![](/writing/<slug>/…)`.

### Remap Substack cross-links

Turn links to your own Substack posts into on-site `/writing/…` links (uses each post’s `canonical:` plus fuzzy slug matching):

```bash
node scripts/remap-substack-links.mjs           # report
node scripts/remap-substack-links.mjs --apply   # write
node scripts/remap-substack-links.mjs --apply --map old-substack-slug=local-slug
```
