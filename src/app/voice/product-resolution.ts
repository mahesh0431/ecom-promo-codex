import type {
  ProductResolution,
  VoiceProductSummary
} from "@/app/voice/voice-types";

export function resolveProductReference(
  products: VoiceProductSummary[],
  reference: string
): ProductResolution {
  const normalizedReference = normalizeSearchValue(reference);

  if (!normalizedReference) {
    return { kind: "missing" };
  }

  const exact = products.find(
    (product) =>
      normalizeSearchValue(product.productId) === normalizedReference ||
      normalizeSearchValue(product.sku) === normalizedReference ||
      normalizeSearchValue(product.name) === normalizedReference
  );

  if (exact) {
    return { kind: "matched", product: exact };
  }

  const scoredMatches = products
    .map((product) => ({
      product,
      score: scoreProductMatch(product, normalizedReference)
    }))
    .filter((match) => match.score > 0)
    .sort((first, second) => second.score - first.score);

  if (!scoredMatches.length) {
    return { kind: "missing" };
  }

  const [best, second] = scoredMatches;

  if (second && second.score === best.score) {
    return {
      kind: "ambiguous",
      matches: scoredMatches
        .filter((match) => match.score === best.score)
        .map((match) => match.product)
    };
  }

  return { kind: "matched", product: best.product };
}

export function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function scoreProductMatch(
  product: VoiceProductSummary,
  normalizedReference: string
) {
  const name = normalizeSearchValue(product.name);
  const sku = normalizeSearchValue(product.sku);
  const category = normalizeSearchValue(product.category);
  const haystack = `${name} ${sku} ${category}`;

  if (sku.includes(normalizedReference)) {
    return 90;
  }

  if (name.includes(normalizedReference)) {
    return 80;
  }

  const referenceTokens = normalizedReference.split(" ").filter(Boolean);
  const nameTokens = new Set(name.split(" ").filter(Boolean));
  const tokenMatches = referenceTokens.filter((token) => nameTokens.has(token));

  if (tokenMatches.length === referenceTokens.length) {
    return 70 + tokenMatches.length;
  }

  if (referenceTokens.some((token) => haystack.includes(token))) {
    return tokenMatches.length || 1;
  }

  return 0;
}
