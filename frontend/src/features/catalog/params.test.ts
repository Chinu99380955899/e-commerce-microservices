import { describe, expect, it } from 'vitest';
import {
  apiPage,
  buildCatalogueSearch,
  DEFAULT_CATALOGUE_PARAMS,
  parseCatalogueParams,
} from './params';

describe('catalogue URL mapping', () => {
  it('reads every filter from the URL', () => {
    const params = parseCatalogueParams(
      new URLSearchParams('category=kitchen&sort=price%2Casc&size=24&page=3'),
    );
    expect(params).toEqual({ category: 'kitchen', sort: 'price,asc', size: 24, page: 3 });
  });

  it('falls back to defaults for unknown values', () => {
    const params = parseCatalogueParams(
      new URLSearchParams('category=cars&sort=random&size=7&page=abc'),
    );
    expect(params).toEqual(DEFAULT_CATALOGUE_PARAMS);
  });

  it('converts the 1-based page to the 0-based API page', () => {
    expect(apiPage({ ...DEFAULT_CATALOGUE_PARAMS, page: 1 })).toBe(0);
    expect(apiPage({ ...DEFAULT_CATALOGUE_PARAMS, page: 2 })).toBe(1);
  });

  it('writes only non-default values back to the URL', () => {
    const search = buildCatalogueSearch({ category: 'bags', sort: 'name,asc', size: 12, page: 1 });
    expect(search.toString()).toBe('category=bags');
  });

  it('round-trips a full state', () => {
    const state = {
      category: 'fitness' as const,
      sort: 'price,desc' as const,
      size: 48 as const,
      page: 2,
    };
    expect(parseCatalogueParams(buildCatalogueSearch(state))).toEqual(state);
  });
});
