/**
 * Build an Elementor data tree for a TTG blog post by populating a template
 * captured from a recently published post.
 *
 * The template represents the canonical layout: meta description + 2-column
 * intro (text + featured image) + Quick navigation TOC + per-H2 section
 * containers + final CTA button.
 */

import templateData from "./elementor-template.json";

const ELEMENTOR_TEMPLATE = templateData as ElementorElement[];

type ElementorSettings = Record<string, unknown> | unknown[];

export interface ElementorElement {
  id: string;
  elType: "section" | "column" | "container" | "widget";
  settings: ElementorSettings;
  elements: ElementorElement[];
  widgetType?: string;
  templateID?: string | number;
  draft?: boolean;
}

function newId(): string {
  // 7-char hex matches Elementor's native ID style
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 7);
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function regenerateIds(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) regenerateIds(item);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.id === "string" && typeof obj.elType === "string") {
      obj.id = newId();
    }
    for (const v of Object.values(obj)) regenerateIds(v);
  }
}

function findFirst(
  elements: ElementorElement[],
  pred: (el: ElementorElement) => boolean,
): ElementorElement | null {
  for (const el of elements) {
    if (pred(el)) return el;
    const sub = findFirst(el.elements ?? [], pred);
    if (sub) return sub;
  }
  return null;
}

function collectAll(
  elements: ElementorElement[],
  pred: (el: ElementorElement) => boolean,
  acc: ElementorElement[] = [],
): ElementorElement[] {
  for (const el of elements) {
    if (pred(el)) acc.push(el);
    collectAll(el.elements ?? [], pred, acc);
  }
  return acc;
}

function findH2SectionContainers(elements: ElementorElement[]): ElementorElement[] {
  return collectAll(elements, (el) => {
    if (el.elType !== "container") return false;
    return (el.elements ?? []).some(
      (k) =>
        k.widgetType === "heading" &&
        ((k.settings as Record<string, unknown>)?.header_size ?? "h2") === "h2",
    );
  });
}

/** Find the parent array containing the element with the given ID. */
function findParentArray(
  root: ElementorElement[],
  targetId: string,
): { parent: ElementorElement[]; index: number } | null {
  for (const el of root) {
    const idx = (el.elements ?? []).findIndex((c) => c.id === targetId);
    if (idx >= 0) return { parent: el.elements, index: idx };
    const sub = findParentArray(el.elements ?? [], targetId);
    if (sub) return sub;
  }
  return null;
}

function makeHeadingWidget(title: string, headerSize = "h2"): ElementorElement {
  return {
    id: newId(),
    elType: "widget",
    settings: { title, header_size: headerSize },
    elements: [],
    widgetType: "heading",
  };
}

function makeTextEditorWidget(html: string): ElementorElement {
  return {
    id: newId(),
    elType: "widget",
    settings: { editor: html },
    elements: [],
    widgetType: "text-editor",
  };
}

function makeSectionContainer(h2Title: string, bodyHtml: string): ElementorElement {
  return {
    id: newId(),
    elType: "container",
    settings: [],
    elements: [makeHeadingWidget(h2Title, "h2"), makeTextEditorWidget(bodyHtml)],
  };
}

function copyButtonWidget(
  container: ElementorElement,
  ctaText: string,
  ctaUrl: string,
): ElementorElement {
  const existing = (container.elements ?? []).find((e) => e.widgetType === "button");
  if (existing) {
    const cloned = deepClone(existing);
    regenerateIds(cloned);
    const settings = cloned.settings as Record<string, unknown>;
    settings.text = ctaText;
    settings.link = {
      url: ctaUrl,
      is_external: "on",
      nofollow: "",
      custom_attributes: "",
    };
    return cloned;
  }
  return {
    id: newId(),
    elType: "widget",
    settings: {
      text: ctaText,
      link: { url: ctaUrl, is_external: "on", nofollow: "", custom_attributes: "" },
    },
    elements: [],
    widgetType: "button",
  };
}

export interface BuildElementorInput {
  metaDescriptionHtml: string;
  introHtml: string;
  sections: { title: string; body: string }[];
  imageUrl: string;
  imageId: number;
  imageAlt?: string;
  ctaText?: string;
  ctaUrl?: string;
}

/** Returns a JSON-encoded Elementor data string ready to send via the WP REST API. */
export function buildElementorData(input: BuildElementorInput): string {
  const data: ElementorElement[] = deepClone(ELEMENTOR_TEMPLATE);
  regenerateIds(data);

  // 1. Top text-editor — meta description + keyword line
  const topEditor = findFirst(data, (e) => e.widgetType === "text-editor");
  if (topEditor) {
    (topEditor.settings as Record<string, unknown>).editor = input.metaDescriptionHtml;
  }

  // 2. Second text-editor (left column intro paragraphs)
  const allTextEditors = collectAll(data, (e) => e.widgetType === "text-editor");
  if (allTextEditors[1]) {
    (allTextEditors[1].settings as Record<string, unknown>).editor = input.introHtml;
  }

  // 3. Image widget — swap URL + ID
  const imgWidget = findFirst(data, (e) => e.widgetType === "image");
  if (imgWidget) {
    (imgWidget.settings as Record<string, unknown>).image = {
      url: input.imageUrl,
      id: input.imageId,
      size: "",
      alt: input.imageAlt ?? "",
      source: "library",
    };
  }

  // 4. Replace H2 section containers with our generated ones, anchored at the
  // first existing one. The final container in the template carries the CTA
  // button, which we copy onto our final new section.
  const existingContainers = findH2SectionContainers(data);
  if (existingContainers.length > 0 && input.sections.length > 0) {
    const first = existingContainers[0];
    const last = existingContainers[existingContainers.length - 1];
    const parentInfo = findParentArray(data, first.id);
    if (!parentInfo) return JSON.stringify(data);
    const parent = parentInfo.parent;
    const firstIdx = parentInfo.index;
    const lastIdx = parent.indexOf(last);
    const lastHasButton = (last.elements ?? []).some((e) => e.widgetType === "button");

    const ctaText = input.ctaText ?? "Book a Free Consultation";
    const ctaUrl = input.ctaUrl ?? "https://traumatherapygroup.janeapp.com/#/free-consultation";
    const newContainers: ElementorElement[] = input.sections.map((s, i) => {
      const c = makeSectionContainer(s.title, s.body);
      if (i === input.sections.length - 1 && lastHasButton) {
        c.elements.push(copyButtonWidget(last, ctaText, ctaUrl));
      }
      return c;
    });

    parent.splice(firstIdx, lastIdx - firstIdx + 1, ...newContainers);
  }

  return JSON.stringify(data);
}
