import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "content", "posts");

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
};

export type Post = PostMeta & {
  content: string;
};

function ensurePostsDir(): void {
  if (!fs.existsSync(postsDirectory)) {
    fs.mkdirSync(postsDirectory, { recursive: true });
  }
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
  };
}

function readPostFile(filename: string): Post {
  const fullPath = path.join(postsDirectory, filename);
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
    content,
  };
}

export function getPostSlugs(): string[] {
  ensurePostsDir();
  return fs
    .readdirSync(postsDirectory)
    .filter(isMarkdownFile)
    .map(slugFromFilename);
}

export function getAllPosts(): PostMeta[] {
  ensurePostsDir();
  const posts = fs
    .readdirSync(postsDirectory)
    .filter(isMarkdownFile)
    .map((filename) => toMeta(readPostFile(filename)));

  return posts.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function getPostBySlug(slug: string): Post | null {
  ensurePostsDir();
  const mdPath = path.join(postsDirectory, `${slug}.md`);
  const mdxPath = path.join(postsDirectory, `${slug}.mdx`);
  if (fs.existsSync(mdPath)) return readPostFile(`${slug}.md`);
  if (fs.existsSync(mdxPath)) return readPostFile(`${slug}.mdx`);
  return null;
}
