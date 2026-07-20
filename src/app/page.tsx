import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { WritingCard } from "@/components/WritingCard";
import { about, links, projects } from "@/lib/content";
import { getAllPosts } from "@/lib/posts";

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <>
      <Header />
      <main className="page-shell">
        <section id="about" className="section">
          <h1 className="section-title">About</h1>
          <div className="about-copy">
            {about.paragraphs.map((parts, index) => (
              <p key={index}>
                {parts.map((part, partIndex) =>
                  part.type === "link" ? (
                    <a
                      key={partIndex}
                      href={part.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {part.label}
                    </a>
                  ) : (
                    <span key={partIndex}>{part.text}</span>
                  )
                )}
              </p>
            ))}
          </div>
        </section>

        <section id="projects" className="section">
          <h2 className="section-title">Projects</h2>
          <div className="project-scroll" role="list">
            {projects.map((project) => (
              <div key={project.slug} className="project-scroll-item" role="listitem">
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        </section>

        <section id="writing" className="section">
          <h2 className="section-title">Writing</h2>
          {posts.length > 0 ? (
            <div className="writing-scroll" role="list">
              {posts.map((post) => (
                <div
                  key={post.slug}
                  className="writing-scroll-item"
                  role="listitem"
                >
                  <WritingCard post={post} />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section id="links" className="section">
          <h2 className="section-title">Links</h2>
          <div className="links-row">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
