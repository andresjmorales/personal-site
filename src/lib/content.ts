export type Project = {
  slug: string;
  title: string;
  description: string;
  href: string;
  github?: string;
  /** Optional image under /public/projects/ */
  image?: string;
  accent: string;
};

export type SocialLink = {
  label: string;
  href: string;
};

export type BioPart =
  | { type: "text"; text: string }
  | { type: "link"; label: string; href: string };

export const site = {
  name: "Andrés Morales",
  title: "Andrés Morales",
  description: "Andrés Morales",
  url: "https://andresmorales.xyz",
};

export const about = {
  paragraphs: [
    [
      {
        type: "text",
        text: "Hi, my name is Andrés. I’m a software engineer based in Austin, originally from the Bay Area.\
        I like writing about theological and technological topics, as well as making open source tools.",
      },
    ],
    [
      { type: "text", text: "I’m a Christian and a member of " },
      {
        type: "link",
        label: "Park Hills Baptist Church",
        href: "https://parkhillsbaptist.church/",
      },
      { type: "text", text: ", and I serve at " },
      {
        type: "link",
        label: "Community First! Village",
        href: "https://mlf.org/community-first",
      },
      { type: "text", text: "." },
    ],
    [
      {
        type: "text",
        text: "I also enjoy playing pickleball, and watching movies with my wife.",
      },
    ],
  ] satisfies BioPart[][],
};

export const projects: Project[] = [
  {
    slug: "cognote",
    title: "CogNote",
    description:
      "Open-source music notation and concept learning platform.",
    href: "https://cognote.studio/",
    github: "https://github.com/andresjmorales/cognote",
    image: "/projects/cognote.svg",
    accent: "#3f6212",
  },
  {
    slug: "blog-ide",
    title: "BlogIDE",
    description:
      "Self-hostable browser-first IDE for writing blogs and essays.",
    href: "https://blogide.com",
    github: "https://github.com/andresjmorales/blog-ide",
    image: "/projects/blog-ide.svg",
    accent: "#0f766e",
  },
  {
    slug: "spanright",
    title: "Spanright",
    description:
      "Multi-monitor wallpaper alignment across any display setup.",
    href: "https://spanright.com/",
    github: "https://github.com/andresjmorales/spanright",
    image: "/projects/spanright.png",
    accent: "#1d4ed8",
  },
  {
    slug: "spanright-calibrate",
    title: "Spanright Calibrate",
    description:
      "Companion tool for detecting monitor details and calibrating alignment.",
    href: "https://github.com/andresjmorales/spanright-calibrate",
    github: "https://github.com/andresjmorales/spanright-calibrate",
    image: "/projects/spanright-calibrate.png",
    accent: "#0369a1",
  },
  {
    slug: "find-a-time",
    title: "Let’s Find a Time!",
    description: "A simple group event scheduler.",
    href: "https://find-a-time.app/",
    github: "https://github.com/andresjmorales/find-a-time",
    image: "/projects/find-a-time.png",
    accent: "#7c3aed",
  }
];

export const links: SocialLink[] = [
  { label: "Substack", href: "https://andresmorales.substack.com/" },
  { label: "LinkedIn", href: "https://linkedin.com/in/andresjmorales" },
  { label: "YouTube", href: "https://youtube.com/@andresjmorales" },
  { label: "GitHub", href: "https://github.com/andresjmorales" },
];
