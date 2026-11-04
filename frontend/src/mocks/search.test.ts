import { describe, expect, it } from 'vitest';
import { seedProducts } from './seed/products';
import { keywordSearch, semanticSearch, trigramSimilarity } from './search';

/** The seed catalogue with ids, in the same shape the search functions receive. */
const catalogue = seedProducts.map((product, index) => ({
  id: `id-${String(index + 1)}`,
  name: product.name,
  brand: product.brand,
  category: product.category,
  description: product.description,
}));

function nameOf(hits: { name: string }[], index: number): string {
  const hit = hits[index];
  if (!hit) throw new Error(`No hit at position ${index}`);
  return hit.name;
}

describe('trigramSimilarity', () => {
  it('scores identical words as 1 and unrelated words as low', () => {
    expect(trigramSimilarity('kafka', 'kafka')).toBe(1);
    expect(trigramSimilarity('kafka', 'lunch')).toBeLessThan(0.2);
  });
});

describe('keywordSearch', () => {
  it('finds headphones for a typo', () => {
    const hits = keywordSearch(catalogue, 'hedphones');
    expect(hits.map((hit) => hit.name)).toContain('Studio Over-Ear Headphones');
  });

  it('finds the dumbbell set for a typo', () => {
    const hits = keywordSearch(catalogue, 'dumbell');
    expect(nameOf(hits, 0)).toBe('Adjustable Dumbbell Set 10kg');
  });

  it('returns nothing for a blank query', () => {
    expect(keywordSearch(catalogue, '   ')).toEqual([]);
  });

  it('ranks the best match first', () => {
    const hits = keywordSearch(catalogue, 'power bank');
    expect(nameOf(hits, 0)).toBe('Power Bank 20000mAh');
  });
});

describe('semanticSearch', () => {
  it('puts a steel flask in the top 3 for keeping tea hot on a train trip', () => {
    const hits = semanticSearch(catalogue, 'something to keep tea hot on a long train trip');
    const top3 = hits.slice(0, 3).map((hit) => hit.product.name);
    expect(top3).toContain('Steel Vacuum Flask 750ml');
  });

  it('puts sport earbuds first for gym earbuds', () => {
    const hits = semanticSearch(catalogue, 'gym earbuds');
    expect(
      nameOf(
        hits.map((hit) => hit.product),
        0,
      ),
    ).toBe('Sport Wireless Earbuds for Gym');
  });

  it('puts a laptop bag first for a bag for my laptop', () => {
    const hits = semanticSearch(catalogue, 'a bag for my laptop');
    const first = hits[0]?.product;
    expect(first?.category).toBe('bags');
    expect(first?.name.toLowerCase()).toContain('laptop');
  });

  it('returns scores between 0 and 1, best first', () => {
    const hits = semanticSearch(catalogue, 'gym earbuds');
    for (const hit of hits) {
      expect(hit.score).toBeGreaterThanOrEqual(0);
      expect(hit.score).toBeLessThanOrEqual(1);
    }
    const scores = hits.map((hit) => hit.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('finds nothing for a product that is not in the catalogue', () => {
    expect(semanticSearch(catalogue, 'iphone')).toEqual([]);
  });
});
