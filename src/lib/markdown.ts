import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Element, Root, Text } from "hast";

function cloneHastChildren(
  children: Element["children"]
): Element["children"] {
  return JSON.parse(JSON.stringify(children)) as Element["children"];
}

function brNode(): Element {
  return { type: "element", tagName: "br", properties: {}, children: [] };
}

/**
 * Tips live in a <span>; block tags like <p> are invalid there and can make
 * browsers/HTML serializers blow up the rest of the document. Flatten to
 * phrasing content, preserving paragraph breaks as <br><br>.
 */
function flattenTipChildren(
  children: Element["children"]
): Element["children"] {
  const out: Element["children"] = [];
  let afterBlock = false;

  for (const child of cloneHastChildren(children)) {
    // Footnote AST often has "\n" text nodes between blocks; ignoring them
    // prevents a leading <br><br> (extra top whitespace) in every tip.
    if (child.type === "text" && !child.value.trim()) {
      continue;
    }
    if (
      child.type === "element" &&
      (child.tagName === "p" || child.tagName === "div")
    ) {
      if (out.length > 0 || afterBlock) {
        out.push(brNode(), brNode());
      }
      out.push(...flattenTipChildren(child.children));
      afterBlock = true;
      continue;
    }
    if (child.type === "element" && child.tagName === "li") {
      if (out.length > 0) out.push(brNode());
      out.push(...flattenTipChildren(child.children));
      afterBlock = true;
      continue;
    }
    if (child.type === "element") {
      child.children = flattenTipChildren(child.children);
    }
    out.push(child);
    afterBlock = false;
  }
  return out;
}

function textContent(node: Element | Root): string {
  let out = "";
  visit(node, "text", (textNode: Text) => {
    out += textNode.value;
  });
  return out;
}

function classList(node: Element): string[] {
  const value: unknown = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

function setClass(node: Element, className: string): void {
  node.properties = { ...node.properties, className: [className] };
}

function isFootnoteBackref(node: Element): boolean {
  if (node.tagName !== "a") return false;
  const href = String(node.properties?.href || "");
  const classes = classList(node);
  return (
    node.properties?.dataFootnoteBackref != null ||
    href.includes("fnref") ||
    classes.some((name) => name.includes("backref") || name.includes("back"))
  );
}

/** Remove remark-gfm ↩ backrefs nested inside footnote bodies. */
function stripBackrefs(node: Element): void {
  node.children = node.children.filter((child) => {
    if (child.type !== "element") return true;
    if (isFootnoteBackref(child)) return false;
    stripBackrefs(child);
    return true;
  });
}

function isElement(node: unknown): node is Element {
  return Boolean(
    node && typeof node === "object" && (node as Element).type === "element"
  );
}

function isWhitespaceText(node: { type: string; value?: string }): boolean {
  return node.type === "text" && !node.value?.trim();
}

function isBreakLike(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as { type: string; tagName?: string; value?: string };
  if (n.type === "element" && (n.tagName === "br" || n.tagName === "wbr")) {
    return true;
  }
  // remark softbreak → newline text inside the same paragraph.
  if (n.type === "text" && n.value != null && /^\n+$/.test(n.value)) {
    return true;
  }
  return false;
}

/**
 * Adjacent caption (no blank line in markdown) lands in the same <p> as the
 * image: <p><img>\\nCaption</p>. A blank line yields a separate following <p>
 * and is intentionally NOT treated as a caption.
 */
function splitImageCaptionParagraph(
  node: Element
): { img: Element; captionChildren: Element["children"] } | null {
  if (node.tagName !== "p") return null;

  let imgIndex = -1;
  let img: Element | null = null;
  for (let i = 0; i < node.children.length; i += 1) {
    const child = node.children[i];
    if (child.type === "text" && isWhitespaceText(child)) continue;
    if (isElement(child) && child.tagName === "img") {
      imgIndex = i;
      img = child;
      break;
    }
    return null;
  }
  if (!img || imgIndex < 0) return null;

  let captionStart = imgIndex + 1;
  while (captionStart < node.children.length) {
    const child = node.children[captionStart];
    if (child.type === "text" && isWhitespaceText(child)) {
      captionStart += 1;
      continue;
    }
    if (isBreakLike(child)) {
      captionStart += 1;
      continue;
    }
    break;
  }

  const captionChildren = node.children.slice(captionStart).filter((child) => {
    if (child.type === "text" && isWhitespaceText(child)) return false;
    if (isBreakLike(child)) return false;
    return true;
  });

  // Trim a leading newline that remark leaves on the first text node.
  if (
    captionChildren.length > 0 &&
    captionChildren[0].type === "text" &&
    typeof captionChildren[0].value === "string"
  ) {
    const trimmed = captionChildren[0].value.replace(/^\n+/, "");
    if (!trimmed.trim()) {
      captionChildren.shift();
    } else {
      captionChildren[0] = { ...captionChildren[0], value: trimmed };
    }
  }

  if (captionChildren.length === 0) return null;

  let captionText = "";
  for (const child of captionChildren) {
    if (child.type === "text") captionText += child.value;
    else if (isElement(child)) captionText += textContent(child);
  }
  if (!captionText.trim()) return null;

  return { img, captionChildren };
}

function toFigure(img: Element, captionChildren: Element["children"]): Element {
  return {
    type: "element",
    tagName: "figure",
    properties: { className: ["content-figure"] },
    children: [
      img,
      {
        type: "element",
        tagName: "figcaption",
        properties: { className: ["content-caption"] },
        children: captionChildren,
      },
    ],
  };
}

function transformImageCaptions(parent: Root | Element): void {
  if (!parent.children?.length) return;
  // Skip existing figures (raw HTML escape hatch).
  if (isElement(parent) && parent.tagName === "figure") return;

  const children = parent.children as Root["children"];
  const nextChildren: Root["children"] = [];

  for (let i = 0; i < children.length; i += 1) {
    const current = children[i];

    if (!isElement(current) || current.tagName === "figure") {
      nextChildren.push(current);
      continue;
    }

    const split = splitImageCaptionParagraph(current);
    if (split) {
      nextChildren.push(toFigure(split.img, split.captionChildren));
      continue;
    }

    nextChildren.push(current);
  }

  parent.children = nextChildren as typeof parent.children;
}

/**
 * Image captions: only when caption text shares the image's paragraph
 * (markdown with no blank line between `![](...)` and the caption line).
 * Alt text stays on <img>; blank-line follow-ups are never captions.
 */
function rehypeImageCaptions() {
  return (tree: Root) => {
    transformImageCaptions(tree);
    visit(tree, "element", (node: Element) => {
      transformImageCaptions(node);
    });
  };
}

/**
 * Restyle remark-gfm footnotes to match BlogIDE publication preview:
 * numbered refs with hover tips + back-linked endnotes.
 */
function rehypePublicationFootnotes() {
  return (tree: Root) => {
    /** Formatted tip bodies (hast), keyed by footnote href / id. */
    const tipByHref = new Map<string, Element["children"]>();

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "section") return;
      const classes = classList(node);
      const isFootnotes =
        node.properties?.dataFootnotes != null ||
        classes.includes("footnotes");
      if (!isFootnotes) return;

      setClass(node, "preview-footnotes");
      node.properties = {
        ...node.properties,
        ariaLabel: "Footnotes",
      };

      for (const child of node.children) {
        if (child.type !== "element") continue;
        if (child.tagName === "h2") {
          setClass(child, "preview-footnotes-heading");
          child.children = [{ type: "text", value: "Footnotes" }];
        }
        if (child.tagName === "ol") {
          setClass(child, "preview-footnotes-list");
          let index = 0;
          for (const li of child.children) {
            if (li.type !== "element" || li.tagName !== "li") continue;
            index += 1;
            const id = String(li.properties?.id || `fn-${index}`);
            const n = id.replace(/^user-content-fn-/, "").replace(/^fn-/, "");
            const display = /^\d+$/.test(n) ? n : String(index);

            setClass(li, "preview-footnotes-item");
            li.properties = { ...li.properties, id: `fn-${display}` };

            // Strip remark-gfm ↩ backrefs; rebuild BlogIDE-style back link.
            const bodyChildren = [...li.children];
            for (const child of bodyChildren) {
              if (child.type === "element") stripBackrefs(child);
            }
            const cleanedBody = bodyChildren.filter(
              (c) => !(c.type === "element" && isFootnoteBackref(c))
            );
            const tipChildren = flattenTipChildren(cleanedBody);
            tipByHref.set(`#${id}`, tipChildren);
            tipByHref.set(`#fn-${display}`, tipChildren);
            tipByHref.set(`#user-content-fn-${display}`, tipChildren);

            li.children = [
              {
                type: "element",
                tagName: "a",
                properties: {
                  className: ["preview-footnotes-back"],
                  href: `#fnref-${display}`,
                  ariaLabel: `Back to reference ${display}`,
                },
                children: [{ type: "text", value: `${display}.` }],
              },
              {
                type: "element",
                tagName: "div",
                properties: { className: ["preview-footnotes-body"] },
                children: cleanedBody,
              },
            ];
          }
        }
      }
    });

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "sup") return;
      const link = node.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "a"
      );
      if (!link) return;
      const href = String(link.properties?.href || "");
      if (!href.includes("fn") || href.includes("fnref")) return;

      const rawId = href.replace(/^#/, "");
      const n = rawId.replace(/^user-content-fn-/, "").replace(/^fn-/, "");
      const tipChildren =
        tipByHref.get(href) ||
        tipByHref.get(`#fn-${n}`) ||
        tipByHref.get(`#user-content-fn-${n}`) ||
        ([{ type: "text", value: "Footnote" }] as Element["children"]);

      // Real HTML tooltip (CSS attr() cannot carry formatting).
      // Keep aria-label short — long labels with quotes were breaking the HTML.
      node.properties = {
        ...node.properties,
        id: `fnref-${n}`,
        className: ["preview-fn"],
      };
      link.properties = {
        href: `#fn-${n}`,
        className: ["preview-fn-ref"],
        dataFn: n,
        ariaLabel: `Footnote ${n}`,
      };
      link.children = [{ type: "text", value: n }];
      node.children = [
        link,
        {
          type: "element",
          tagName: "span",
          properties: {
            className: ["preview-fn-tip"],
            role: "tooltip",
          },
          children: cloneHastChildren(tipChildren),
        },
      ];
    });
  };
}

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a || []),
      "dataFn",
      ["className"],
    ],
    span: [...(defaultSchema.attributes?.span || []), ["className"], "role"],
    sup: [...(defaultSchema.attributes?.sup || []), ["className"], "id"],
    section: [
      ...(defaultSchema.attributes?.section || []),
      "dataFootnotes",
      ["className"],
      ["ariaLabel"],
    ],
    ol: [...(defaultSchema.attributes?.ol || []), ["className"]],
    li: [...(defaultSchema.attributes?.li || []), ["className"], "id"],
    div: [...(defaultSchema.attributes?.div || []), ["className"]],
    h2: [...(defaultSchema.attributes?.h2 || []), ["className"]],
    figure: [["className"]],
    figcaption: [["className"]],
    img: [
      ...(defaultSchema.attributes?.img || []),
      "src",
      "alt",
      "title",
      "width",
      "height",
      "loading",
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "section",
    "sup",
    "img",
    "figure",
    "figcaption",
  ],
} as typeof defaultSchema;

export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, schema)
    .use(rehypeImageCaptions)
    .use(rehypePublicationFootnotes)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}
