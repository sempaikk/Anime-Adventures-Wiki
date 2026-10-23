type User = { id: string; name: string; avatar: string };
type Session = { enabled: boolean; user: User | null };
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
let sessionPromise: Promise<Session> | undefined;
let favoritesPromise: Promise<{ ids: string[]; account: boolean }> | undefined;
let mutationQueue: Promise<unknown> = Promise.resolve();
const cleanIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string =>
              typeof id === "string" && /^[a-z0-9-]{1,110}$/.test(id),
          ),
        ),
      ].slice(0, 1000)
    : [];
function accountRemembered(value?: boolean) {
  try {
    if (value !== undefined)
      localStorage.setItem("aa-account-active", value ? "1" : "0");
    return localStorage.getItem("aa-account-active") === "1";
  } catch {
    return false;
  }
}
export function localFavorites() {
  try {
    return cleanIds(JSON.parse(localStorage.getItem("aa-favorites") || "[]"));
  } catch {
    return [];
  }
}
export function getSession(): Promise<Session> {
  if (!sessionPromise)
    sessionPromise = base
      ? Promise.resolve({ enabled: false, user: null })
      : fetch("/api/session", { credentials: "same-origin" })
          .then(async (response) => {
            if (!response.ok) throw Error();
            const value = await response.json();
            if (value.enabled !== true && accountRemembered()) throw Error();
            accountRemembered(!!value.user);
            return {
              enabled: value.enabled === true,
              user:
                value.user &&
                typeof value.user.id === "string" &&
                typeof value.user.name === "string"
                  ? value.user
                  : null,
            };
          })
          .catch(() => {
            sessionPromise = undefined;
            if (accountRemembered())
              throw Error(
                "Não foi possível acessar sua conta agora. Tente novamente em instantes; seus favoritos salvos continuam na conta.",
              );
            return { enabled: false, user: null };
          });
  return sessionPromise;
}
export async function accountApi(path: string, method = "GET", data?: unknown) {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: data ? { "Content-Type": "application/json" } : {},
    ...(data ? { body: JSON.stringify(data) } : {}),
  }).catch(() => {
    throw Error(
      "Sem conexão para sincronizar. Confira sua internet e tente novamente.",
    );
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Error(
      result.error || "Não foi possível sincronizar agora. Tente novamente.",
    );
  return result;
}
export function getFavorites() {
  if (!favoritesPromise)
    favoritesPromise = getSession()
      .then(async (session) =>
        session.user
          ? {
              ids: cleanIds((await accountApi("/favorites")).ids),
              account: true,
            }
          : { ids: localFavorites(), account: false },
      )
      .catch((error) => {
        favoritesPromise = undefined;
        throw error;
      });
  return favoritesPromise;
}
async function mutateFavorite(id: string, desired?: boolean) {
  const state = await getFavorites();
  if (!state.account) state.ids = localFavorites();
  const wasSaved = state.ids.includes(id), active = desired ?? !wasSaved;
  if (!wasSaved && active && state.ids.length >= 1000)
    throw Error("Sua coleção atingiu o limite de 1.000 favoritos.");
  if (state.account)
    await accountApi(
      "/favorites/" + encodeURIComponent(id),
      active ? "PUT" : "DELETE",
    );
  const ids = active ? wasSaved ? state.ids : [...state.ids, id] : state.ids.filter((value) => value !== id);
  if (!state.account) {
    try {
      localStorage.setItem("aa-favorites", JSON.stringify(ids));
    } catch {
      throw Error(
        "Seu navegador não permitiu salvar. Libere o armazenamento deste site e tente novamente.",
      );
    }
  }
  state.ids = ids;
  favoritesPromise = Promise.resolve(state);
  try { localStorage.setItem("aa-favorites-updated", `${Date.now()}-${Math.random()}`); } catch { /* Saving already reports storage failures for guests. */ }
  document.dispatchEvent(new Event("aa:favorites-changed"));
  return { active, account: state.account };
}
function enqueue(id: string, active?: boolean) {
  const result = mutationQueue.then(() => mutateFavorite(id, active));
  mutationQueue = result.catch(() => {});
  return result;
}
export const toggleFavorite = (id: string) => enqueue(id);
export const removeFavorite = (id: string) => enqueue(id, false);
function invalidate() {
  sessionPromise = favoritesPromise = undefined;
  document.dispatchEvent(new Event("aa:favorites-changed"));
}
window.addEventListener("storage", (event) => {
  if (event.key === null || ["aa-favorites", "aa-account-active", "aa-favorites-updated"].includes(event.key)) invalidate();
});
window.addEventListener("pageshow", (event) => { if (event.persisted) invalidate(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") invalidate(); });
