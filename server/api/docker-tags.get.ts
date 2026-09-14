import { createError, defineEventHandler, getQuery } from 'h3';
import { normalizeTagList, shouldExcludeTag } from '@/utils/dockerTags';

interface TagCacheEntry {
  expiresAt: number;
  tags: string[];
}
interface DockerHubTagResult {
  name?: string;
  last_updated?: string;
}

const TAG_CACHE_TTL_MS = 5 * 60 * 1000;
const tagCache = new Map<string, TagCacheEntry>();

export default defineEventHandler(async event => {
  const query = getQuery(event);
  const repository = String(query.repo || '').trim();

  if (!repository) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing "repo" query parameter.',
    });
  }

  const cached = tagCache.get(repository);
  if (cached && cached.expiresAt > Date.now()) {
    return { tags: cached.tags };
  }

  const [namespace, repo] = repository.split('/');
  if (!namespace || !repo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid repository format. Use "<namespace>/<repo>".',
    });
  }

  try {
    const result: Array<{ name: string; updatedAt: number }> = [];
    let nextUrl = `https://hub.docker.com/v2/namespaces/${namespace}/repositories/${repo}/tags?page_size=50&ordering=last_updated`;
    let pageCounter = 0;

    while (nextUrl && pageCounter < 2) {
      const response = (await $fetch(nextUrl)) as {
        results?: DockerHubTagResult[];
        next?: string | null;
      };

      (response.results || []).forEach(item => {
        if (item.name && !shouldExcludeTag(item.name)) {
          const updatedAt = item.last_updated ? Date.parse(item.last_updated) : 0;
          result.push({ name: item.name, updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0 });
        }
      });
      nextUrl = response.next || '';
      pageCounter += 1;
    }

    result.sort((a, b) => b.updatedAt - a.updatedAt);
    const tags = normalizeTagList(result.map(item => item.name));
    tagCache.set(repository, {
      expiresAt: Date.now() + TAG_CACHE_TTL_MS,
      tags,
    });

    return { tags };
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not fetch tags from Docker Hub.',
      data: {
        repository,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
});
