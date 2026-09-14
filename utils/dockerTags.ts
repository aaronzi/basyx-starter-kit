export type TagCategory = 'snapshot' | 'release' | 'other';
export interface TagItem {
  title: string;
  value: string;
  category: TagCategory;
}
export interface NormalizeTagOptions {
  includeLatest?: boolean;
  includeSnapshot?: boolean;
}

const BASYX_UI_RELEASE_PATTERN = /^v2-\d{6}$/;
const BASYX_GO_RELEASE_PATTERN = /^v?\d+\.\d+\.\d+(?:-rc\.\d+)?$/i;
const SHORT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

export function isSnapshotTag(tag: string): boolean {
  return tag.toUpperCase().includes('SNAPSHOT');
}

function isShortShaTag(tag: string): boolean {
  return SHORT_SHA_PATTERN.test(tag.trim());
}

export function shouldExcludeTag(tag: string): boolean {
  const normalized = tag.trim();
  if (!normalized) {
    return true;
  }

  const lower = normalized.toLowerCase();
  return lower === 'buildcache' || lower.endsWith('.att') || lower.endsWith('.sig');
}

function isBasyxUiRepository(repository: string): boolean {
  return repository === 'eclipsebasyx/aas-gui';
}

function isBasyxGoRepository(repository: string): boolean {
  return (
    repository === 'eclipsebasyx/aasenvironment-go' ||
    repository === 'eclipsebasyx/basyxconfigurationservice-go'
  );
}

function isManagedBasyxRepository(repository: string): boolean {
  return isBasyxUiRepository(repository) || isBasyxGoRepository(repository);
}

export function classifyTag(tag: string, repository: string): TagCategory {
  if (isSnapshotTag(tag)) {
    return 'snapshot';
  }

  if (isManagedBasyxRepository(repository) && isShortShaTag(tag)) {
    return 'snapshot';
  }

  if (tag === 'latest') {
    return 'release';
  }

  if (isBasyxUiRepository(repository)) {
    return BASYX_UI_RELEASE_PATTERN.test(tag) ? 'release' : 'other';
  }

  if (isBasyxGoRepository(repository)) {
    return BASYX_GO_RELEASE_PATTERN.test(tag) ? 'release' : 'other';
  }

  return 'other';
}

export function toTagItems(tags: string[], repository: string): TagItem[] {
  return tags.map(tag => ({
    title: tag,
    value: tag,
    category: classifyTag(tag, repository),
  }));
}

export function normalizeTagList(tags: string[], options: NormalizeTagOptions = {}): string[] {
  const unique = Array.from(
    new Set(tags.map(tag => tag.trim()).filter(tag => tag.length > 0 && !shouldExcludeTag(tag)))
  );

  if (options.includeLatest && !unique.includes('latest')) {
    unique.push('latest');
  }
  if (options.includeSnapshot && !unique.includes('SNAPSHOT')) {
    unique.push('SNAPSHOT');
  }

  return unique;
}

export function chooseDefaultTag(tags: string[], repository = ''): string {
  if (tags.includes('latest')) {
    return 'latest';
  }

  if (repository) {
    const newestRelease = tags.find(tag => classifyTag(tag, repository) === 'release');
    if (newestRelease) {
      return newestRelease;
    }

    const newestNonSnapshot = tags.find(tag => classifyTag(tag, repository) !== 'snapshot');
    if (newestNonSnapshot) {
      return newestNonSnapshot;
    }
  }

  const newestNonSnapshot = tags.find(tag => !isSnapshotTag(tag));
  if (newestNonSnapshot) {
    return newestNonSnapshot;
  }

  if (tags.includes('SNAPSHOT')) {
    return 'SNAPSHOT';
  }

  return tags[0] || 'latest';
}
