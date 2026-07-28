import Image from "next/image";
import type { CSSProperties } from "react";
import type { Project } from "@/lib/content";

function StarIcon() {
  return (
    <svg
      className="project-card-stars-icon"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 1.25l1.76 3.56 3.93.57-2.84 2.77.67 3.91L8 10.27l-3.52 1.85.67-3.91L2.31 5.38l3.93-.57L8 1.25z" />
    </svg>
  );
}

export function ProjectCard({
  project,
  stars,
}: {
  project: Project;
  stars?: number | null;
}) {
  const initial = project.title.replace(/^Let’s /, "L").charAt(0);
  const showStars = typeof stars === "number";

  return (
    <article
      className="project-card"
      style={{ "--project-accent": project.accent } as CSSProperties}
    >
      <a
        href={project.href}
        className="project-card-main"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="project-card-media" aria-hidden="true">
          {project.image ? (
            <Image
              src={project.image}
              alt=""
              fill
              className="project-card-image"
              sizes="(max-width: 768px) 82vw, 280px"
            />
          ) : (
            <span className="project-card-mark">{initial}</span>
          )}
        </div>
        <div className="project-card-body">
          <h3 className="project-card-title">{project.title}</h3>
          <p className="project-card-desc">{project.description}</p>
        </div>
      </a>
      {project.github ? (
        <div className="project-card-footer">
          <a
            href={project.github}
            className="project-card-github"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
          {showStars ? (
            <a
              href={`${project.github.replace(/\/$/, "")}/stargazers`}
              className="project-card-stars"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${stars} GitHub stars`}
            >
              <StarIcon />
              <span>{stars}</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
