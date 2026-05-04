import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/session";

/**
 * Server-side proxy for Unsplash photo search. Hides the access key
 * from the client and trims the response to just what the picker
 * needs. Auth-gated so anonymous visitors can't burn through our
 * 50 req/hour rate limit.
 */
export type UnsplashPhoto = {
  id: string;
  alt: string | null;
  thumbUrl: string;
  regularUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  photographerName: string;
  photographerUrl: string;
  downloadLocation: string;
  color: string | null;
};

type UnsplashRaw = {
  results: Array<{
    id: string;
    alt_description: string | null;
    color: string | null;
    width: number;
    height: number;
    urls: { thumb: string; small: string; regular: string; full: string };
    user: { name: string; links: { html: string } };
    links: { download_location: string };
  }>;
  total: number;
  total_pages: number;
};

export async function GET(request: Request) {
  await requireUser();
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      { error: "UNSPLASH_ACCESS_KEY not configured on the server." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const page = Number(searchParams.get("page") ?? "1");
  const orientation = searchParams.get("orientation") ?? "landscape";

  if (query.length === 0) {
    return NextResponse.json({ results: [], total: 0, total_pages: 0 });
  }

  const params = new URLSearchParams({
    query,
    per_page: "12",
    page: String(Number.isFinite(page) && page > 0 ? page : 1),
    orientation,
    content_filter: "high",
  });

  let upstream: Response;
  try {
    upstream = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      // Cache for 5 minutes per query — saves rate limit when the user
      // bounces between popular searches like "moon" or "calm".
      next: { revalidate: 300 },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Unsplash unreachable: ${err instanceof Error ? err.message : "error"}` },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Unsplash returned ${upstream.status}` },
      { status: upstream.status },
    );
  }

  const data = (await upstream.json()) as UnsplashRaw;
  const results: UnsplashPhoto[] = data.results.map((r) => ({
    id: r.id,
    alt: r.alt_description,
    thumbUrl: r.urls.thumb,
    regularUrl: r.urls.regular,
    fullUrl: r.urls.full,
    width: r.width,
    height: r.height,
    photographerName: r.user.name,
    photographerUrl: r.user.links.html,
    downloadLocation: r.links.download_location,
    color: r.color,
  }));

  return NextResponse.json({
    results,
    total: data.total,
    totalPages: data.total_pages,
  });
}
