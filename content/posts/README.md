# Writing posts

Drop [BlogIDE](https://github.com/andresjmorales/blog-ide)-format (or cleaned Substack-pasted) markdown files here.

Metadata lives in YAML frontmatter at the top of each file (same place BlogIDE already uses for title / subtitle / author). This site reads those fields; BlogIDE is the natural place to *edit* them later (e.g. a kebab-menu “Export for site” that fills `date`, `tags`, `canonical`).

## Filename → URL

`my-essay.md` becomes `/writing/my-essay`.

## Frontmatter

```md
---
title: My essay title
subtitle: Optional subtitle
author: Andrés Morales
date: 2026-07-19
description: Optional short blurb for the homepage card
tags:
  - theology
  - science
canonical: https://andresmorales.substack.com/p/my-essay
---

Essay body with GFM footnotes[^1].

[^1]: Footnote body supports markdown.
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Falls back to filename slug if missing. Quote if it contains a colon: `title: "Abolition of Man: The Review"` |
| `subtitle` | no | Shown on the article page |
| `author` | no | Shown on the article page |
| `date` | no | `YYYY-MM-DD`; sorts Writing cards |
| `description` | no | Homepage card blurb (else subtitle) |
| `tags` | no | List or comma-separated; shown in the article ⓘ details |
| `canonical` | no | Original URL (aliases: `substack`, `source`) |

Supported extensions: `.md`, `.mdx`.

## Images

Substack paste often leaves CDN URLs like `https://substackcdn.com/image/fetch/...`. Those usually work for a while, but they’re not yours, Substack can change paths, tighten hotlinking, or drop assets.

**Recommended for this site:** download images into the repo and point markdown at local paths (faster, no CDN rot).

```bash
# from repo root — one post or all posts
npm run localize-images -- my-essay
npm run localize-images
```

That writes files under `public/writing/<slug>/` and rewrites the markdown URLs.

```text
public/writing/<slug>/hero.jpg
```

```md
![](/writing/my-essay/hero.jpg)
```

### Captions + alt text

Captions are a **separate line immediately under the image with no blank line**:

```md
![](/writing/my-essay/hero.jpg)
Image made with [DALL·E 2](https://openai.com/dall-e-2/)
```

```md
![A lamb looking over a fence](/writing/my-essay/lamb.jpg)
Lao Tzu, founder of Taoism
```

| Markdown | Result |
| --- | --- |
| `![](src)` then caption on the **next line** (no blank line) | Visible `<figcaption>` |
| `![](src)` then blank line then a paragraph | Image only — next paragraph is normal body text |
| Non-empty `alt` only | Image only — alt stays on `<img>` for accessibility, **not** shown as a caption |
| `"title"` in `![](src "title")` | Ignored for captions (Substack often puts a source URL here) |
| Raw HTML `<figure>…<figcaption>` | Passed through as-is |

Tip: use **alt** for what the image is (screen readers); use the **adjacent caption line** for credits or visible context.

#### Substack paste caveats

Substack usually inserts a **blank line** between the image and the caption. With a blank line, this site will **not** treat that credit as a caption.

**Fix after paste:** delete the blank line so the caption sits on the line right under the image, or set the caption in BlogIDE’s rich view (“Add caption”). Put a short description in `alt` if you want one; do not rely on Substack’s quoted title.
