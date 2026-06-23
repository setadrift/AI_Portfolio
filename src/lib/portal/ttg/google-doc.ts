/**
 * Fetch a Google Doc as HTML using the public export endpoint.
 *
 * The doc must be shared as "Anyone with the link can view" for this to work
 * without OAuth. We support both /document/d/ID/edit URLs and bare IDs.
 */

const DOC_ID_PATTERN = /\/document\/d\/([a-zA-Z0-9_-]+)/;

export function extractDocId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = trimmed.match(DOC_ID_PATTERN);
  if (m) return m[1];
  // If they pasted a bare ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export async function fetchGoogleDocAsHtml(docIdOrUrl: string): Promise<string> {
  const id = extractDocId(docIdOrUrl);
  if (!id) {
    throw new Error("Could not extract a Google Doc ID from that URL");
  }
  const url = `https://docs.google.com/document/d/${id}/export?format=html`;
  const res = await fetch(url, {
    headers: {
      // A real-browser UA helps avoid Google's anti-bot heuristics on these endpoints
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(
      `Couldn't fetch the Google Doc (HTTP ${res.status}). ` +
        `Make sure it's shared as "Anyone with the link can view".`,
    );
  }
  const text = await res.text();
  if (text.includes("Sign in") && text.length < 5000) {
    throw new Error(
      'The Google Doc is private. Share it as "Anyone with the link can view" and try again.',
    );
  }
  return text;
}
