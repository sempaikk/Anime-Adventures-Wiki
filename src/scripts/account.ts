import {closeDialog} from './ui-motion';
import { accountApi, getSession, localFavorites } from "./favorites";

getSession()
  .then((session) => {
    if (session.user) {
      const link = document.querySelector<HTMLElement>("[data-account-link]");
      const label = link?.querySelector<HTMLElement>("[data-account-label]");
      if (label) { label.dataset.noTranslate=""; label.setAttribute("translate","no"); label.textContent = session.user.name; }
      if (
        link &&
        /^https:\/\/cdn\.discordapp\.com\/(?:avatars|embed\/avatars)\//.test(
          session.user.avatar,
        )
      ) {
        const image = document.createElement("img");
        image.src = session.user.avatar;
        image.alt = "";
        image.width = 29;
        image.height = 29;
        link.querySelector(".account-avatar-placeholder")?.replaceWith(image);
      }
    }
    if (session.enabled)
      document
        .querySelectorAll<HTMLElement>("[data-account-entry]")
        .forEach((link) => {
          link.hidden = false;
        });
    const scope = document.querySelector<HTMLElement>("[data-favorite-scope]");
    if (scope && session.user)
      scope.textContent =
        "Sua coleção acompanha sua conta do Discord, no celular e no computador.";
  })
  .catch(() => {
    document
      .querySelectorAll<HTMLElement>("[data-account-entry]")
      .forEach((link) => {
        link.hidden = false;
      });
  });

const page = document.querySelector<HTMLElement>("[data-account-page]");
if (page) {
  const message = page.querySelector<HTMLElement>("[data-account-message]")!;
  const setMessage = (value: string) => {
    message.textContent = value;
    message.hidden = false;
  };
  getSession()
    .then(async (session) => {
      page.querySelector<HTMLElement>("[data-account-loading]")!.hidden = true;
      if (!session.enabled) {
        page.querySelector<HTMLElement>("[data-account-unavailable]")!.hidden =
          false;
        return;
      }
      if (!session.user) {
        page.querySelector<HTMLElement>("[data-account-login]")!.hidden = false;
        const reason = new URLSearchParams(location.search).get("auth");
        if (reason)
          setMessage(
            reason === "cancelled"
              ? "A entrada foi cancelada. Você pode continuar sem conta ou tentar novamente."
              : "Não foi possível concluir a entrada. Abra a confirmação novamente para tentar.",
          );
        return;
      }
      const profile = page.querySelector<HTMLElement>(
        "[data-account-profile]",
      )!;
      profile.hidden = false;
      profile.querySelector<HTMLElement>("[data-account-name]")!.textContent =
        session.user.name;
      const avatar = profile.querySelector<HTMLImageElement>(
        "[data-account-avatar]",
      )!;
      if (
        /^https:\/\/cdn\.discordapp\.com\/(?:avatars|embed\/avatars)\//.test(
          session.user.avatar,
        )
      )
        avatar.src = session.user.avatar;
      else avatar.hidden = true;
      try {
        const result = await accountApi("/favorites");
        profile.querySelector<HTMLElement>(
          "[data-account-count]",
        )!.textContent =
          `${result.ids.length} favorito${result.ids.length === 1 ? "" : "s"} na sua conta`;
      } catch (error) {
        setMessage((error as Error).message);
      }
      const merge = profile.querySelector<HTMLButtonElement>(
        "[data-account-merge]",
      )!;
      merge.hidden = !localFavorites().length;
      merge.addEventListener("click", async () => {
        merge.disabled = true;
        try {
          await accountApi("/favorites/merge", "POST", {
            ids: localFavorites(),
          });
          location.reload();
        } catch (error) {
          setMessage((error as Error).message);
          merge.disabled = false;
        }
      });
      const logout = profile.querySelector<HTMLButtonElement>(
        "[data-account-logout]",
      )!;
      logout.addEventListener("click", async () => {
        logout.disabled = true;
        try {
          await accountApi("/logout", "POST");
          location.reload();
        } catch (error) {
          setMessage((error as Error).message);
          logout.disabled = false;
        }
      });
      const confirmation = page.querySelector<HTMLDialogElement>(
        "[data-account-delete-dialog]",
      )!;
      profile
        .querySelector("[data-account-delete]")!
        .addEventListener("click", () => confirmation.showModal());
      confirmation
        .querySelector("[data-delete-cancel]")!
        .addEventListener("click", () => closeDialog(confirmation));
      const remove = confirmation.querySelector<HTMLButtonElement>(
        "[data-delete-confirm]",
      )!;
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          await accountApi("/account", "DELETE");
          location.reload();
        } catch (error) {
          closeDialog(confirmation);
          setMessage((error as Error).message);
          remove.disabled = false;
        }
      });
    })
    .catch((error) => {
      page.querySelector<HTMLElement>("[data-account-loading]")!.hidden = true;
      setMessage((error as Error).message);
    });
}
