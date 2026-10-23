/** Article slugs remain stable; catalog-only forms have a separate namespace. */
export function unitFavoriteKey(unit) {
  return unit.article || `unit-${unit.id.replace(/_/g, "-")}`;
}
