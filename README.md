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
