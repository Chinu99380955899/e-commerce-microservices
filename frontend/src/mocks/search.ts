import type { CategoryKey } from '../api/schemas';

export interface SearchableProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  description: string;
}

/** pg_trgm-style trigrams: lower-cased words, each padded with two spaces in front and one behind. */
export function trigrams(value: string): Set<string> {
  const grams = new Set<string>();
  for (const word of value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)) {
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i += 1) grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

/** Trigram similarity between two single words, 0 to 1 (|A∩B| / |A∪B|). */
export function trigramSimilarity(a: string, b: string): number {
  const ga = trigrams(a);
  const gb = trigrams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let shared = 0;
  for (const gram of ga) if (gb.has(gram)) shared += 1;
  return shared / (ga.size + gb.size - shared);
}

/** Keyword match threshold, like pg_trgm's similarity threshold. */
export const KEYWORD_THRESHOLD = 0.2;

function words(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Typo-tolerant keyword search over name, brand and category. Every query word must match
 * some word of the product by trigram similarity; the score is the average of those best matches.
 */
export function keywordSearch<T extends SearchableProduct>(
  products: readonly T[],
  query: string,
): (T & { score: number })[] {
  const queryWords = words(query);
  if (queryWords.length === 0) return [];
  const results: (T & { score: number })[] = [];
  for (const product of products) {
    const haystack = words(`${product.name} ${product.brand ?? ''} ${product.category}`);
    let total = 0;
    let allMatched = true;
    for (const queryWord of queryWords) {
      let best = 0;
      for (const candidate of haystack) {
        const sim = trigramSimilarity(queryWord, candidate);
        if (sim > best) best = sim;
      }
      if (best < KEYWORD_THRESHOLD) allMatched = false;
      total += best;
    }
    if (!allMatched) continue;
    results.push({ ...product, score: total / queryWords.length });
  }
  return results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Words that carry no meaning for matching. */
const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'you',
  'are',
  'can',
  'some',
  'something',
  'any',
  'my',
  'me',
  'on',
  'of',
  'a',
  'an',
  'to',
  'in',
  'is',
  'it',
  'at',
  'by',
  'or',
  'be',
  'do',
  'i',
  'want',
  'need',
  'long',
  'good',
  'best',
  'show',
  'please',
  'under',
  'over',
  'more',
  'than',
  'like',
  'make',
  'keep',
]);

function stem(word: string): string {
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function tokens(value: string): string[] {
  return words(value)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map(stem);
}

interface Concept {
  /** Query words that activate the concept. */
  triggers: string[];
  /** Words that product text should contain to be relevant to the concept. */
  terms: string[];
}

/** Concept map used to match by meaning: "tea on a train" finds flasks and mugs. */
export const CONCEPTS: Concept[] = [
  {
    triggers: [
      'tea',
      'coffee',
      'hot',
      'warm',
      'cold',
      'flask',
      'insulated',
      'thermos',
      'mug',
      'travel',
      'train',
      'trip',
      'commute',
    ],
    terms: [
      'flask',
      'mug',
      'insulated',
      'hot',
      'warm',
      'vacuum',
      'travel',
      'tea',
      'coffee',
      'bottle',
      'keep',
      'steel',
    ],
  },
  {
    triggers: [
      'gym',
      'workout',
      'sweat',
      'sweaty',
      'run',
      'running',
      'exercise',
      'fitness',
      'sport',
      'sports',
      'training',
      'yoga',
      'cardio',
      'jog',
      'jogging',
    ],
    terms: [
      'gym',
      'workout',
      'sport',
      'sweat',
      'running',
      'fitness',
      'exercise',
      'training',
      'yoga',
      'cardio',
      'bottle',
      'resistance',
    ],
  },
  {
    triggers: [
      'laptop',
      'office',
      'commute',
      'work',
      'computer',
      'notebook',
      'bag',
      'backpack',
      'sleeve',
    ],
    terms: ['laptop', 'office', 'commute', 'bag', 'sleeve', 'backpack', 'padded', 'protect'],
  },
  {
    triggers: [
      'sleep',
      'air',
      'dust',
      'allergy',
      'allergies',
      'clean',
      'purify',
      'pollution',
      'smoke',
      'pollen',
      'humid',
      'dry',
    ],
    terms: [
      'air',
      'purifier',
      'hepa',
      'dust',
      'clean',
      'filter',
      'sleep',
      'humidifier',
      'moisture',
      'pollen',
    ],
  },
  {
    triggers: [
      'music',
      'listen',
      'audio',
      'sound',
      'bluetooth',
      'wireless',
      'earphone',
      'earphones',
      'earbud',
      'earbuds',
      'headphone',
      'headphones',
      'bass',
    ],
    terms: [
      'earbud',
      'earbuds',
      'headphone',
      'headphones',
      'audio',
      'sound',
      'bluetooth',
      'wireless',
      'earphone',
      'earphones',
      'music',
    ],
  },
  {
    triggers: [
      'cook',
      'cooking',
      'kitchen',
      'food',
      'lunch',
      'blend',
      'smoothie',
      'chef',
      'knife',
      'meal',
    ],
    terms: [
      'cooking',
      'kitchen',
      'food',
      'lunch',
      'blender',
      'cooker',
      'knife',
      'meal',
      'steel',
      'chef',
    ],
  },
  {
    triggers: [
      'book',
      'books',
      'read',
      'learn',
      'java',
      'spring',
      'kafka',
      'code',
      'programming',
      'developer',
      'study',
    ],
    terms: [
      'book',
      'java',
      'spring',
      'kafka',
      'programming',
      'developer',
      'guide',
      'practical',
      'streaming',
      'services',
    ],
  },
  {
    triggers: ['charge', 'charging', 'battery', 'power', 'phone', 'travel', 'portable'],
    terms: ['charging', 'battery', 'power', 'charger', 'usb', 'portable', 'mah'],
  },
  {
    triggers: ['home', 'room', 'bedroom', 'living', 'decor', 'light', 'lamp', 'desk', 'study'],
    terms: ['lamp', 'light', 'home', 'room', 'desk', 'decor', 'living', 'bedroom'],
  },
];

export interface SemanticHit<T> {
  product: T;
  score: number;
}

/**
 * Meaning-based search: exact word overlap with name and description, plus concept hits from the
 * concept map. Scores are normalised to 0–0.98 and only products with some relevance are returned.
 */
export function semanticSearch<T extends SearchableProduct>(
  products: readonly T[],
  query: string,
): SemanticHit<T>[] {
  const queryTokens = new Set(tokens(query));
  if (queryTokens.size === 0) return [];

  const activeConcepts = CONCEPTS.filter((concept) =>
    concept.triggers.some((trigger) => queryTokens.has(stem(trigger))),
  );

  const hits: SemanticHit<T>[] = [];
  for (const product of products) {
    const nameTokens = new Set(
      tokens(`${product.name} ${product.brand ?? ''} ${product.category}`),
    );
    const descTokens = new Set(tokens(product.description));

    let nameHits = 0;
    let descHits = 0;
    for (const token of queryTokens) {
      if (nameTokens.has(token)) nameHits += 1;
      else if (descTokens.has(token)) descHits += 1;
    }

    let conceptHits = 0;
    for (const concept of activeConcepts) {
      for (const term of concept.terms) {
        if (nameTokens.has(stem(term)) || descTokens.has(stem(term))) conceptHits += 1;
      }
    }

    const raw = nameHits * 2 + descHits + conceptHits * 0.5;
    if (raw === 0) continue;
    const score = Math.min(0.98, Math.round((raw / 10) * 100) / 100);
    hits.push({ product, score: Math.max(score, 0.05) });
  }
  return hits.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
}

/** Category keys for quick checks against free text. */
export const CATEGORY_WORDS: Record<string, CategoryKey> = {
  electronics: 'electronics',
  electronic: 'electronics',
  kitchen: 'kitchen',
  fitness: 'fitness',
  bags: 'bags',
  bag: 'bags',
  home: 'home',
  books: 'books',
  book: 'books',
};
