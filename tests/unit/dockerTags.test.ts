import {
  chooseDefaultTag,
  classifyTag,
  isSnapshotTag,
  normalizeTagList,
  shouldExcludeTag,
  toTagItems,
} from '@/utils/dockerTags';

describe('dockerTags helpers', () => {
  it('detects snapshot tags case-insensitively', () => {
    expect(isSnapshotTag('SNAPSHOT')).toBe(true);
    expect(isSnapshotTag('1.0.0-snapshot')).toBe(true);
    expect(isSnapshotTag('latest')).toBe(false);
  });

  it('normalizes tag list and enforces BaSyx defaults', () => {
    const tags = normalizeTagList(['1.2.0', '1.2.0', 'SNAPSHOT', 'buildcache', '1.3.0.sig'], {
      includeLatest: true,
      includeSnapshot: true,
    });
    expect(tags.includes('latest')).toBe(true);
    expect(tags.includes('SNAPSHOT')).toBe(true);
    expect(tags.filter(tag => tag === '1.2.0')).toHaveLength(1);
    expect(tags.includes('buildcache')).toBe(false);
    expect(tags.includes('1.3.0.sig')).toBe(false);
  });

  it('chooses latest first, then newest non-snapshot, then snapshot', () => {
    expect(chooseDefaultTag(['1.2.0', 'latest', 'SNAPSHOT'])).toBe('latest');
    expect(chooseDefaultTag(['2.0.0', '1.9.0', 'SNAPSHOT'])).toBe('2.0.0');
    expect(chooseDefaultTag(['SNAPSHOT'])).toBe('SNAPSHOT');
  });

  it('filters excluded tags', () => {
    expect(shouldExcludeTag('buildcache')).toBe(true);
    expect(shouldExcludeTag('1.2.0.att')).toBe(true);
    expect(shouldExcludeTag('1.2.0.sig')).toBe(true);
    expect(shouldExcludeTag('1.2.0')).toBe(false);
  });

  it('classifies release and snapshot tags for BaSyx repos', () => {
    expect(classifyTag('SNAPSHOT', 'eclipsebasyx/aas-gui')).toBe('snapshot');
    expect(classifyTag('v2-250101', 'eclipsebasyx/aas-gui')).toBe('release');
    expect(classifyTag('4d99e9c', 'eclipsebasyx/aas-gui')).toBe('snapshot');
    expect(classifyTag('1.0.0', 'eclipsebasyx/aasenvironment-go')).toBe('release');
    expect(classifyTag('1.0.0-rc.1', 'eclipsebasyx/aasenvironment-go')).toBe('release');
    expect(classifyTag('4d99e9c', 'eclipsebasyx/aasenvironment-go')).toBe('snapshot');
    expect(classifyTag('50d4006', 'eclipsebasyx/basyxconfigurationservice-go')).toBe('snapshot');
    expect(classifyTag('feature-x', 'eclipsebasyx/aasenvironment-go')).toBe('other');
  });

  it('falls back to latest release for managed repos when latest is missing', () => {
    expect(
      chooseDefaultTag(
        ['SNAPSHOT', '4d99e9c', '1.0.0-rc.2'],
        'eclipsebasyx/basyxconfigurationservice-go'
      )
    ).toBe('1.0.0-rc.2');
    expect(chooseDefaultTag(['SNAPSHOT', 'b769ae5', 'v2-260101'], 'eclipsebasyx/aas-gui')).toBe(
      'v2-260101'
    );
  });

  it('builds tag items with deterministic categories', () => {
    const uiItems = toTagItems(['v2-260101', 'SNAPSHOT', 'dev'], 'eclipsebasyx/aas-gui');
    expect(uiItems[0]).toEqual({ title: 'v2-260101', value: 'v2-260101', category: 'release' });
    expect(uiItems[1]).toEqual({ title: 'SNAPSHOT', value: 'SNAPSHOT', category: 'snapshot' });
    expect(uiItems[2]).toEqual({ title: 'dev', value: 'dev', category: 'other' });

    const goItems = toTagItems(
      ['latest', '1.0.0-rc.1', 'nightly'],
      'eclipsebasyx/aasenvironment-go'
    );
    expect(goItems[0]?.category).toBe('release');
    expect(goItems[1]?.category).toBe('release');
    expect(goItems[2]?.category).toBe('other');
  });
});
