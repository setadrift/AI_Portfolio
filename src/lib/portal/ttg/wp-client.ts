/**
 * WordPress REST API client for traumatherapygroup.com.
 * Auth via Application Password (Basic auth + the .htaccess fix).
 */

const USER_AGENT = "TTG-Publisher/1.0 (gabby blog automation)";

export interface WpConfig {
  baseUrl: string;
  username: string;
  appPassword: string;
}

export function loadWpConfig(): WpConfig {
  const baseUrl = process.env.TTG_WP_BASE_URL;
  const username = process.env.TTG_WP_USERNAME;
  const appPassword = process.env.TTG_WP_APP_PASSWORD;
  if (!baseUrl || !username || !appPassword) {
    throw new Error(
      "Missing TTG_WP_BASE_URL, TTG_WP_USERNAME, or TTG_WP_APP_PASSWORD env vars",
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), username, appPassword };
}

function authHeader(cfg: WpConfig): string {
  const raw = `${cfg.username}:${cfg.appPassword}`;
  // Edge runtime supports btoa
  const b64 = typeof btoa === "function" ? btoa(raw) : Buffer.from(raw).toString("base64");
  return `Basic ${b64}`;
}

async function wpRequest<T = unknown>(
  cfg: WpConfig,
  method: string,
  path: string,
  init: { jsonBody?: unknown; rawBody?: ArrayBuffer | Uint8Array; extraHeaders?: Record<string, string> } = {},
): Promise<T> {
  const url = `${cfg.baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: authHeader(cfg),
    "User-Agent": USER_AGENT,
    ...(init.extraHeaders ?? {}),
  };
  let body: BodyInit | undefined;
  if (init.jsonBody !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.jsonBody);
  } else if (init.rawBody !== undefined) {
    body = init.rawBody as BodyInit;
  }
  const res = await fetch(url, { method, headers, body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WP ${method} ${path} failed: ${res.status} ${text.slice(0, 500)}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export interface WpMedia {
  id: number;
  source_url: string;
}

export async function uploadMedia(
  cfg: WpConfig,
  imageBytes: ArrayBuffer,
  filename: string,
  altText = "",
  title = "",
): Promise<WpMedia> {
  const mime = filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const media = await wpRequest<WpMedia>(cfg, "POST", "/wp-json/wp/v2/media", {
    rawBody: imageBytes,
    extraHeaders: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": mime,
    },
  });
  if (altText || title) {
    return await wpRequest<WpMedia>(cfg, "POST", `/wp-json/wp/v2/media/${media.id}`, {
      jsonBody: { alt_text: altText, title },
    });
  }
  return media;
}

export interface CreateDraftInput {
  title: string;
  contentHtml: string;
  excerpt: string;
  featuredMediaId?: number;
  categories?: number[];
  yoastMetaDescription?: string;
  yoastFocusKeyword?: string;
  yoastSeoTitle?: string;
  elementorData?: string;
}

export interface WpPost {
  id: number;
  link: string;
  status: string;
}

export async function createDraftPost(cfg: WpConfig, input: CreateDraftInput): Promise<WpPost> {
  const meta: Record<string, string> = {};
  if (input.yoastMetaDescription) meta._yoast_wpseo_metadesc = input.yoastMetaDescription;
  if (input.yoastFocusKeyword) meta._yoast_wpseo_focuskw = input.yoastFocusKeyword;
  if (input.yoastSeoTitle) meta._yoast_wpseo_title = input.yoastSeoTitle;
  if (input.elementorData) {
    meta._elementor_data = input.elementorData;
    meta._elementor_edit_mode = "builder";
    meta._elementor_template_type = "wp-post";
  }

  const payload: Record<string, unknown> = {
    title: input.title,
    content: input.contentHtml,
    excerpt: input.excerpt,
    status: "draft",
  };
  if (input.featuredMediaId) payload.featured_media = input.featuredMediaId;
  if (input.categories && input.categories.length) payload.categories = input.categories;
  if (Object.keys(meta).length) payload.meta = meta;

  return await wpRequest<WpPost>(cfg, "POST", "/wp-json/wp/v2/posts", { jsonBody: payload });
}

export async function deletePost(cfg: WpConfig, id: number): Promise<void> {
  await wpRequest(cfg, "DELETE", `/wp-json/wp/v2/posts/${id}?force=true`);
}

export async function deleteMedia(cfg: WpConfig, id: number): Promise<void> {
  await wpRequest(cfg, "DELETE", `/wp-json/wp/v2/media/${id}?force=true`);
}
