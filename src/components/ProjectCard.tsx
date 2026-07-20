import Image from "next/image";
import type { CSSProperties } from "react";
import type { Project } from "@/lib/content";

export function ProjectCard({ project }: { project: Project }) {
  const initial = project.title.replace(/^Let’s /, "L").charAt(0);

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
              sizes="(max-width: 768px) 100vw, 320px"
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
        <a
          href={project.github}
          className="project-card-github"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
      ) : null}
    </article>
  );
}
