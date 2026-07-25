import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const contentRoot = path.join(process.cwd(), "content");
const postsDirectory = path.join(contentRoot, "posts");
const draftsDirectory = path.join(contentRoot, "drafts");

/** Frontmatter statuses that hide a post from the Writing rail (slug still works). */
const HIDDEN_STATUSES = new Set(["draft", "unpublished", "hidden"]);

export type PostSource = "posts" | "drafts";

export type PostMeta = {
  slug: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  date: string | null;
  description: string | null;
  tags: string[];
  /** Original Substack (or other) URL */
  canonical: string | null;
  /** Optional publish state; draft/unpublished/hidden are omitted from listings. */
  status: string | null;
  /** Which content folder the file was loaded from. */
  source: PostSource;
};

export type Post = PostMeta & {
  content: string;
};

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureContentDirs(): void {
  ensureDir(postsDirectory);
  ensureDir(draftsDirectory);
}

function isMarkdownFile(name: string): boolean {
  if (name.toLowerCase() === "readme.md") return false;
  return name.endsWith(".md") || name.endsWith(".mdx");
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.mdx?$/, "");
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

function coerceTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function coerceCanonical(data: Record<string, unknown>): string | null {
  return (
    coerceString(data.canonical) ||
    coerceString(data.substack) ||
    coerceString(data.source)
  );
}

function isHiddenFromListing(post: PostMeta): boolean {
  if (post.source === "drafts") return true;
  const status = post.status?.toLowerCase();
  return Boolean(status && HIDDEN_STATUSES.has(status));
}

/** Rough readable word count from markdown body (strips code/images/markup). */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~\\|[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

function toMeta(post: Post): PostMeta {
  return {
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    author: post.author,
    date: post.date,
    description: post.description,
    tags: post.tags,
    canonical: post.canonical,
    status: post.status,
    source: post.source,
  };
}

function readPostFile(dir: string, filename: string, source: PostSource): Post {
  const fullPath = path.join(dir, filename);
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);
  const slug = slugFromFilename(filename);
  const record = data as Record<string, unknown>;

  return {
    slug,
    title: coerceString(record.title) || slug,
    subtitle: coerceString(record.subtitle),
    author: coerceString(record.author),
    date: coerceString(record.date),
    description:
      coerceString(record.description) || coerceString(record.subtitle),
    tags: coerceTags(record.tags),
    canonical: coerceCanonical(record),
    status: coerceString(record.status),
    source,
    content,
  };
}

function listMarkdownIn(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(isMarkdownFile);
}

/**
 * All posts from posts/ then drafts/ (posts wins on slug collision).
 * Includes drafts — use getAllPosts() for the Writing rail.
 */
function loadAllPostsIncludingDrafts(): Post[] {
  ensureContentDirs();
  const bySlug = new Map<string, Post>();

  for (const filename of listMarkdownIn(draftsDirectory)) {
    const post = readPostFile(draftsDirectory, filename, "drafts");
    bySlug.set(post.slug, post);
  }
  // posts/ overwrites drafts/ for the same slug
  for (const filename of listMarkdownIn(postsDirectory)) {
    const post = readPostFile(postsDirectory, filename, "posts");
    bySlug.set(post.slug, post);
  }

  return [...bySlug.values()];
}

export function getPostSlugs(): string[] {
  return loadAllPostsIncludingDrafts().map((post) => post.slug);
}

/** Listed Writing cards — excludes content/drafts and status draft/unpublished/hidden. */
export function getAllPosts(): PostMeta[] {
  const posts = loadAllPostsIncludingDrafts()
    .filter((post) => !isHiddenFromListing(post))
    .map(toMeta);

  return posts.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function getPostBySlug(slug: string): Post | null {
  ensureContentDirs();
  // Prefer published posts/ over drafts/
  for (const [dir, source] of [
    [postsDirectory, "posts"],
    [draftsDirectory, "drafts"],
  ] as const) {
    const mdPath = path.join(dir, `${slug}.md`);
    const mdxPath = path.join(dir, `${slug}.mdx`);
    if (fs.existsSync(mdPath)) return readPostFile(dir, `${slug}.md`, source);
    if (fs.existsSync(mdxPath)) return readPostFile(dir, `${slug}.mdx`, source);
  }
  return null;
}
