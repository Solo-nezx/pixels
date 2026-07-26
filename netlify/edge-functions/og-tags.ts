/**
 * Netlify Edge Function: inject per-post Open Graph tags into index.html.
 *
 * A single-page app serves the same HTML for every URL, so a shared link like
 * `/?post=abc` previews as the generic site on WhatsApp/X/Discord. Crawlers
 * don't run JavaScript, so the tags have to be in the HTML that ships.
 *
 * This runs only when a `?post=` query is present, reads the post through the
 * Firestore REST API (posts are publicly readable), and rewrites the four
 * default og/twitter tags. Any failure falls through to the original page.
 */
const PROJECT_ID = 'pixels-c10b3';
const API_KEY = 'AIzaSyCeAbxDCnbDjEuKJPp47trNXjOcqzdgYaU'; // public web key

/** Firestore REST returns typed values ({ stringValue: … }). */
function readString(field: unknown): string {
  const v = field as { stringValue?: string } | undefined;
  return v?.stringValue ?? '';
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async function handler(request: Request, context: { next: () => Promise<Response> }) {
  const response = await context.next();

  const url = new URL(request.url);
  const postId = url.searchParams.get('post');
  const userId = url.searchParams.get('user');
  if (!postId && !userId) return response;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  try {
    const docPath = postId
      ? `posts/${encodeURIComponent(postId)}`
      : `users/${encodeURIComponent(userId as string)}`;
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}?key=${API_KEY}`,
    );
    if (!res.ok) return response;

    const doc = await res.json();
    const fields = doc?.fields ?? {};

    let title: string;
    let description: string;
    let image: string;

    if (postId) {
      const content = readString(fields.content).slice(0, 200);
      const author = (fields.author as { mapValue?: { fields?: Record<string, unknown> } })?.mapValue?.fields ?? {};
      title = `${readString(author.name) || 'A gamer'} on Pixels`;
      description = content || 'Join the Pixels gamer community.';
      image = readString(fields.imageUrl);
    } else {
      // Profile preview: name, bio and a play-time line.
      const name = readString(fields.name) || 'A gamer';
      const handle = readString(fields.username);
      const games = readString(fields.gamesLoggedCount) || (fields.gamesLoggedCount as { integerValue?: string })?.integerValue || '';
      title = handle ? `${name} (@${handle}) on Pixels` : `${name} on Pixels`;
      description = readString(fields.bio)
        || (games ? `${games} games logged on Pixels.` : 'Join the Pixels gamer community.');
      image = readString(fields.avatar);
    }
    // Inline data-URL images can't be used as previews; fall back to the icon.
    const ogImage = image.startsWith('http') ? image : `${url.origin}/icon-512.png`;

    let html = await response.text();
    html = html
      .replace(
        /<meta property="og:title"[^>]*>/,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
      )
      .replace(
        /<meta property="og:description"[^>]*>/,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
      )
      .replace(
        /<meta property="og:image"[^>]*>/,
        `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
      )
      .replace(
        /<meta property="og:type"[^>]*>/,
        `<meta property="og:type" content="article" />\n    <meta property="og:url" content="${escapeHtml(url.href)}" />`,
      )
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);

    return new Response(html, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), 'content-type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    console.error('og-tags failed:', e);
    return response;
  }
}

export const config = { path: '/' };
