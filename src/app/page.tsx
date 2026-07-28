import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { SectionRail } from "@/components/SectionRail";
import { WritingCard } from "@/components/WritingCard";
import { about, links, projects } from "@/lib/content";
import { fetchGithubStarsMap } from "@/lib/github";
import { getAllPosts } from "@/lib/posts";

export default async function HomePage() {
  const posts = getAllPosts();
  const starsByUrl = await fetchGithubStarsMap(
    projects.map((project) => project.github)
  );

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

        <SectionRail
          id="projects"
          title="Projects"
          railClassName="project-scroll"
        >
          {projects.map((project) => (
            <div
              key={project.slug}
              className="project-scroll-item"
              role="listitem"
            >
              <ProjectCard
                project={project}
                stars={
                  project.github ? starsByUrl.get(project.github) : undefined
                }
              />
            </div>
          ))}
        </SectionRail>

        <SectionRail
          id="writing"
          title="Writing"
          railClassName="writing-scroll"
          hasItems={posts.length > 0}
        >
          {posts.map((post) => (
            <div
              key={post.slug}
              className="writing-scroll-item"
              role="listitem"
            >
              <WritingCard post={post} />
            </div>
          ))}
        </SectionRail>

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
