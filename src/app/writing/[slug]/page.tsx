import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FootnoteTipBounds } from "@/components/FootnoteTipBounds";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { renderMarkdown } from "@/lib/markdown";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.description || post.subtitle || undefined,
  };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Deterministic formatting (avoids locale hydration mismatches). */
function formatDate(date: string | null): string | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return date;
  const year = match[1];
  const month = MONTHS[Number(match[2]) - 1];
  const day = String(Number(match[3]));
  if (!month) return date;
  return `${month} ${day}, ${year}`;
}

export default async function WritingPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const bodyHtml = await renderMarkdown(post.content);
  const dateLabel = formatDate(post.date);

  return (
    <>
      <ScrollToTop />
      <FootnoteTipBounds />
      <Header />
      <main className="article-shell">
        <article className="document-preview-article">
          <header className="document-preview-header">
            <h1 className="document-preview-title">{post.title}</h1>
            {post.subtitle ? (
              <p className="document-preview-subtitle">{post.subtitle}</p>
            ) : null}
            {post.author ? (
              <p className="document-preview-author">{post.author}</p>
            ) : null}
            {dateLabel ? (
              <p className="document-preview-date">
                <time dateTime={post.date || undefined}>{dateLabel}</time>
              </p>
            ) : null}
          </header>
          <div
            className="editor-prose"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </article>
      </main>
    </>
  );
}
