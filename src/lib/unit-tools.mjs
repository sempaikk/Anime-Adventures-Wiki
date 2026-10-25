export const comparisonFields = [
  ["Deployment Cost", "Custo de posicionamento"],
  ["Total Cost", "Custo total"],
  ["Upgrade Levels", "Etapas de upgrade"],
  ["Tower Type", "Tipo de posicionamento"],
];
export const factLabel = (label) => comparisonFields.find(([key]) => key === label)?.[1] || label;
export function factValue(unit, label) {
  const value = unit.facts?.find((fact) => fact.label === label)?.value?.trim();
  return value && !/^(?:true|tryue|false|null|undefined|nan)(?:¥)?$/i.test(value) ? value : null;
}
export function towerType(unit) {
  const value = factValue(unit, "Tower Type") || "";
  return /^ground\b/i.test(value) ? "ground" : /^hill\b/i.test(value) ? "hill" : /^hybrid\b/i.test(value) ? "hybrid" : "";
}
export function deploymentCost(unit) {
  const value = factValue(unit, "Deployment Cost") || "";
  return /^\d+(?:,\d{3})*(?:\.\d+)?¥$/.test(value) ? Number(value.replace(/[,¥]/g, "")) : null;
}
export function validComparison(values, allowed) {
  if (!Array.isArray(values)) return [];
  const ids = allowed instanceof Set ? allowed : new Set(allowed);
  return [...new Set(values.filter((id) => typeof id === "string" && ids.has(id)))].slice(0, 3);
}
