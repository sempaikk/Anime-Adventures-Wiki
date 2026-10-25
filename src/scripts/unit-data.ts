import {localData} from './i18n';
import {requestJson} from './request';
export type Unit = {
  id: string; favorite_id: string; name: string; aliases: string[];
  rarity: string; image: string | null; retired: boolean; url: string;
  facts: { label: string; value: string }[];
  source: { url: string; revision: string } | null;
};
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
let pending: Promise<Unit[]> | undefined;
export function getUnits(): Promise<Unit[]> {
  if (!pending) pending = requestJson(base + localData("units")).then(({response,data}) => {
    if (!response.ok) throw Error("Não foi possível carregar os personagens. Tente novamente.");
    return data;
  }).catch(() => { pending = undefined; throw Error("Não foi possível carregar os personagens. Confira sua conexão e tente novamente."); });
  return pending;
}
