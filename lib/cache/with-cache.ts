import "server-only";

import { unstable_cache } from "next/cache";

import { requireUser } from "@/lib/auth/session";

import type { Tag } from "./tags";

const ONE_HOUR = 60 * 60;

/**
 * Wraps an async DB query so its result is memoised by Next.js' data cache,
 * keyed by the current user id. Tag-based invalidation is the primary
 * freshness mechanism — the time-based revalidate is just a safety net for
 * cases where a mutation slipped past us (e.g. a row edited via Drizzle
 * Studio).
 *
 * `key` is a stable identifier for the query (used as part of the cache
 * key alongside `userId`). `tags` are bound to the cache entry so that a
 * matching `revalidateTag` call from a server action drops it.
 */
export function cachedQuery<T>(
  key: string,
  tags: Tag[],
  fetcher: (userId: string) => Promise<T>,
  options?: { revalidate?: number },
): () => Promise<T> {
  const cached = unstable_cache(fetcher, [key], {
    tags,
    revalidate: options?.revalidate ?? ONE_HOUR,
  });

  return async () => {
    const user = await requireUser();
    return cached(user.id);
  };
}
