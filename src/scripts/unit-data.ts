import {localData} from './i18n';
export type Unit = {
  id: string; favorite_id: string; name: string; aliases: string[];
  rarity: string; image: string | null; retired: boolean; url: string;
  facts: { label: string; value: string }[];
  source: { url: string; revision: string } | null;
};
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
let pending: Promise<Unit[]> | undefined;
export function getUnits(): Promise<Unit[]> {
  if (!pending) pending = fetch(base + localData("units")).then((response) => {
    if (!response.ok) throw Error("Não foi possível carregar os personagens. Tente novamente.");
    return response.json();
  }).catch(() => { pending = undefined; throw Error("Não foi possível carregar os personagens. Confira sua conexão e tente novamente."); });
  return pending;
}
