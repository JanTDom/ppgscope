/**
 * Normalizacja polskiego tekstu i miary podobieństwa używane przez moduły szyby śledczej.
 * Czysta logika bez I/O, żeby dało się ją testować bez sieci.
 */

const STOPWORDS: ReadonlySet<string> = new Set([
  "oraz", "ktory", "ktora", "ktore", "ktorzy", "ktorych", "ktorym", "jest", "sa", "byl", "byla",
  "bylo", "beda", "bedzie", "tego", "tych", "tym", "temu", "przez", "dla", "jako", "przy", "pod",
  "nad", "bez", "tylko", "jeszcze", "juz", "tez", "jego", "jej", "ich", "oni", "ona", "ono",
  "ktoremu", "jak", "czy", "nie", "sie", "ale", "lub", "albo", "gdy", "kiedy", "gdzie", "ktorego",
  "bardzo", "mozna", "moze", "maja", "ma", "mial", "miala", "mieli", "ze", "to", "po", "od", "do",
  "na", "za", "we", "wiecej", "nowe", "nowy", "nowa", "nowych", "wideo", "zdjecia", "foto",
]);

const STEM_LENGTH = 5;
const MIN_KEY_LENGTH = 4;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(text: string): string[] {
  const normalized = normalize(text);
  return normalized.length === 0 ? [] : normalized.split(" ");
}

/**
 * Zbiór kluczy treści: tokeny ucięte do prefiksu, bo polska fleksja psuje dokładne dopasowanie
 * ("Krakowie" i "Krakowa" mają dać ten sam klucz).
 */
export function contentKeys(text: string): Set<string> {
  const keys = new Set<string>();
  for (const token of tokens(text)) {
    if (token.length < MIN_KEY_LENGTH || STOPWORDS.has(token)) continue;
    keys.add(token.length > STEM_LENGTH ? token.slice(0, STEM_LENGTH) : token);
  }
  return keys;
}

export function sharedCount(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const key of small) if (large.has(key)) shared += 1;
  return shared;
}

/** Współczynnik nakładania: wspólne klucze podzielone przez rozmiar mniejszego zbioru. */
export function overlapCoefficient(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const minSize = Math.min(a.size, b.size);
  return minSize === 0 ? 0 : sharedCount(a, b) / minSize;
}

export function shingles(text: string, size: number): Set<string> {
  const words = tokens(text);
  const result = new Set<string>();
  for (let i = 0; i + size <= words.length; i += 1) {
    result.add(words.slice(i, i + size).join(" "));
  }
  return result;
}

/** Jaka część zbioru `subject` występuje w zbiorze `reference`. */
export function containment(subject: ReadonlySet<string>, reference: ReadonlySet<string>): number {
  return subject.size === 0 ? 0 : sharedCount(subject, reference) / subject.size;
}
