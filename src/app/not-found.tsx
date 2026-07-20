import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="article-shell">
        <h1 className="document-preview-title">Page not found</h1>
        <p className="document-preview-subtitle">
          That page doesn’t exist.{" "}
          <Link href="/" style={{ color: "var(--accent)" }}>
            Back home
          </Link>
          .
        </p>
      </main>
    </>
  );
}
