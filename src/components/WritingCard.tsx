import Link from "next/link";
import type { PostMeta } from "@/lib/posts";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
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

export function WritingCard({ post }: { post: PostMeta }) {
  const dateLabel = formatDate(post.date);

  return (
    <Link href={`/writing/${post.slug}`} className="writing-card">
      <div className="writing-card-meta">
        {dateLabel ? <time dateTime={post.date || undefined}>{dateLabel}</time> : null}
      </div>
      <h3 className="writing-card-title">{post.title}</h3>
      {post.subtitle || post.description ? (
        <p className="writing-card-desc">{post.subtitle || post.description}</p>
      ) : null}
    </Link>
  );
}
