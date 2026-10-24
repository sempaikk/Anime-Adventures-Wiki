import {
  communityApi,
  element,
  link,
  picture,
  date,
  status,
  uploadImage,
} from "./community-client";
import { getSession } from "./favorites";
import art from "../../source/interface-art.json";
const errorText = (error: unknown) =>
  (error as Error).message || "Não foi possível carregar agora.";
const covers: any = {
  city: art.city.image,
  spaceship: art.spaceship.image,
  dungeon: art.dungeon.image,
};
function personCard(profile: any) {
  const card = link("", profile.url, "person-card");
  card.append(picture(profile.cover_url, "", "person-card-cover"));
  const body = element("div", "person-card-body");
  body.append(
    picture(profile.avatar, "", "person-card-avatar"),
    element("h3", "", profile.name),
    element("small", "", "@" + profile.handle),
    element(
      "p",
      "",
      profile.bio || "Perfil da comunidade de Anime Adventures.",
    ),
  );
  card.append(body);
  return card;
}

const people = document.querySelector<HTMLElement>("[data-people]");
if (people) {
  const grid = people.querySelector<HTMLElement>("[data-people-grid]")!,
    message = people.querySelector<HTMLElement>("[data-people-status]")!,
    more = people.querySelector<HTMLButtonElement>("[data-people-more]")!,
    form = people.querySelector<HTMLFormElement>("form")!;
  const input = form.elements.namedItem("q") as HTMLInputElement;
  input.value = new URLSearchParams(location.search).get("q") || "";
  let next: number | null = null,
    version = 0;
  async function load(append = false) {
    const ticket = ++version;
    more.disabled = true;
    status(message, "Carregando perfis…");
    try {
      const result = await communityApi(
        "/profiles?q=" +
          encodeURIComponent(input.value) +
          (append && next ? "&before=" + next : ""),
      );
      if (ticket !== version) return;
      if (!append) grid.replaceChildren();
      for (const profile of result.profiles) grid.append(personCard(profile));
      next = result.next;
      more.hidden = !next;
      status(
        message,
        grid.children.length
          ? ""
          : input.value
            ? "Nenhum perfil encontrado. Tente outro nome."
            : "A comunidade ainda não tem perfis públicos. Você pode configurar o primeiro em Sua conta.",
      );
    } catch (error) {
      if (ticket === version) status(message, errorText(error), true);
    } finally {
      if (ticket === version) more.disabled = false;
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const url = new URL(location.href);
    input.value
      ? url.searchParams.set("q", input.value)
      : url.searchParams.delete("q");
    history.replaceState(null, "", url);
    load();
  });
  more.addEventListener("click", () => load(true));
  load();
}

const editor = document.querySelector<HTMLElement>("[data-profile-editor]");
if (editor) {
  const form = editor.querySelector<HTMLFormElement>("form")!,
    message = editor.querySelector<HTMLElement>(
      "[data-profile-editor-status]",
    )!,
    saved = editor.querySelector<HTMLElement>("[data-profile-save-status]")!,
    submit = form.querySelector<HTMLButtonElement>("[type=submit]")!,
    ownLink = form.querySelector<HTMLAnchorElement>("[data-own-profile-link]")!;
  let profile: any,
    discordAvatar = "",
    avatarId: string | null = null,
    bannerId: string | null = null,
    uploads = 0;
  const field = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement;
  const avatar = editor.querySelector<HTMLImageElement>(
      "[data-profile-avatar-preview]",
    )!,
    banner = editor.querySelector<HTMLImageElement>(
      "[data-profile-banner-preview]",
    )!;
  function fill(value: any) {
    profile = value;
    for (const name of [
      "name",
      "handle",
      "bio",
      "roblox_name",
      "website",
      "cover",
    ])
      field(name).value = value[name] || "";
    for (const name of ["published", "show_favorites"])
      field(name).checked = value[name];
    avatarId = value.avatar_id;
    bannerId = value.banner_id;
    avatar.src = value.avatar || discordAvatar;
    banner.src = value.cover_url || covers.city;
    ownLink.hidden = !value.published;
    ownLink.href = value.url || "#";
  }
  getSession()
    .then(async (session) => {
      if (!session.user || !session.enabled) return;
      editor.hidden = false;
      discordAvatar = session.user.avatar;
      try {
        const result = await communityApi("/me");
        fill(result.profile);
        editor.querySelector<HTMLElement>("[data-review-link]")!.hidden =
          !result.moderator;
      } catch (error) {
        status(message, errorText(error), true);
        submit.disabled = true;
      }
    })
    .catch(() => {});
  field("cover").addEventListener("change", () => {
    if (!bannerId) banner.src = covers[field("cover").value];
  });
  for (const input of editor.querySelectorAll<HTMLInputElement>(
    "[data-profile-file]",
  ))
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      uploads++;
      submit.disabled = true;
      status(saved, "Enviando e ajustando imagem…");
      try {
        const kind = input.dataset.profileFile as "avatar" | "banner",
          result = await uploadImage(file, kind);
        if (kind === "avatar") {
          avatarId = result.id;
          avatar.src = result.url;
        } else {
          bannerId = result.id;
          banner.src = result.url;
        }
        status(saved, "Imagem pronta. Salve o perfil para aplicar.");
      } catch (error) {
        status(saved, errorText(error), true);
      } finally {
        uploads--;
        submit.disabled = uploads > 0;
        input.value = "";
      }
    });
  for (const button of editor.querySelectorAll<HTMLButtonElement>(
    "[data-profile-reset]",
  ))
    button.addEventListener("click", () => {
      if (button.dataset.profileReset === "avatar") {
        avatarId = null;
        avatar.src = discordAvatar;
      } else {
        bannerId = null;
        banner.src = covers[field("cover").value];
      }
      status(saved, "Salve o perfil para aplicar a mudança.");
    });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (uploads) return;
    submit.disabled = true;
    status(saved, "Salvando…");
    try {
      const data: any = { avatar_id: avatarId, banner_id: bannerId };
      for (const name of [
        "name",
        "handle",
        "bio",
        "roblox_name",
        "website",
        "cover",
      ])
        data[name] = field(name).value;
      for (const name of ["published", "show_favorites"])
        data[name] = field(name).checked;
      const result = await communityApi("/me", "PUT", data);
      fill(result.profile);
      status(
        saved,
        result.profile.published
          ? "Perfil salvo e publicado."
          : "Perfil salvo. Ele continua privado.",
      );
    } catch (error) {
      status(saved, errorText(error), true);
    } finally {
      submit.disabled = false;
    }
  });
}

const publicPage = document.querySelector<HTMLElement>("[data-public-profile]");
if (publicPage) {
  const message = publicPage.querySelector<HTMLElement>(
      "[data-profile-status]",
    )!,
    content = publicPage.querySelector<HTMLElement>("[data-profile-content]")!;
  const handle =
    location.pathname.match(/^\/perfil\/([a-z0-9_-]{3,24})\/?$/)?.[1] ||
    new URLSearchParams(location.search).get("p");
  async function load() {
    if (!handle) {
      status(
        message,
        "Abra um perfil pela comunidade ou configure o seu em Sua conta.",
      );
      message.append(
        document.createTextNode(" "),
        link("Ver pessoas →", "/pessoas/", "text-link"),
      );
      return;
    }
    try {
      const data = await communityApi(
          "/profiles/" + encodeURIComponent(handle),
        ),
        p = data.profile;
      document.title = p.name + " — Adventures Wiki";
      content.replaceChildren();
      const header = element("header", "public-profile-header");
      header.append(picture(p.cover_url, "Capa do perfil", "profile-banner"));
      const identity = element("div", "public-profile-identity");
      identity.append(
        picture(p.avatar, "Avatar de " + p.name, "profile-avatar"),
      );
      const row = element("div", "profile-identity-row"),
        name = element("div");
      name.append(
        element("h1", "", p.name),
        element("p", "profile-handle", "@" + p.handle),
      );
      if (data.editor)
        name.append(element("span", "editor-badge", "Revisão da wiki"));
      row.append(name);
      if (data.own)
        row.append(
          link("Editar meu perfil", "/conta/#perfil", "button button-outline"),
        );
      identity.append(row);
      if (p.bio) identity.append(element("p", "profile-bio", p.bio));
      const meta = element("div", "profile-meta");
      meta.append(
        element("span", "", "Entrou em " + date(p.joined)),
        element(
          "span",
          "",
          `${data.contributions} ${data.contributions === 1 ? "contribuição" : "contribuições"}`,
        ),
      );
      if (p.roblox_name)
        meta.append(
          element(
            "span",
            "",
            "Roblox: " + p.roblox_name + " · informado pelo jogador",
          ),
        );
      if (p.website) {
        const a = link(new URL(p.website).hostname, p.website);
        a.target = "_blank";
        a.rel = "noopener noreferrer ugc nofollow";
        meta.append(a);
      }
      identity.append(meta);
      header.append(identity);
      content.append(header);
      const sections = element("section", "profile-sections"),
        nav = element("div", "profile-tab-nav");
      nav.setAttribute("role", "tablist");
      nav.setAttribute("aria-label", "Conteúdo do perfil");
      const contributions = element("div"),
        favorites = element("div");
      contributions.id = "profile-contributions";
      favorites.id = "profile-favorites";
      contributions.setAttribute("role", "tabpanel");
      favorites.setAttribute("role", "tabpanel");
      const tabs = [
        ["Contribuições", contributions],
        ...(p.show_favorites ? [["Favoritos", favorites]] : []),
      ] as [string, HTMLDivElement][];
      for (const [index, [label, panel]] of tabs.entries()) {
        const tab = element("button", "", label);
        tab.type = "button";
        tab.setAttribute("role", "tab");
        tab.id = "profile-tab-" + index;
        tab.setAttribute("aria-controls", panel.id);
        panel.setAttribute("aria-labelledby", tab.id);
        tab.setAttribute("aria-selected", String(index === 0));
        tab.tabIndex = index === 0 ? 0 : -1;
        panel.hidden = index !== 0;
        const choose = () => {
          for (const other of nav.querySelectorAll<HTMLButtonElement>(
            "button",
          )) {
            const active = other === tab;
            other.setAttribute("aria-selected", String(active));
            other.tabIndex = active ? 0 : -1;
            document.getElementById(
              other.getAttribute("aria-controls")!,
            )!.hidden = !active;
          }
        };
        tab.addEventListener("click", choose);
        tab.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const all = Array.from(
              nav.querySelectorAll<HTMLButtonElement>("button"),
            ),
            next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? all.length - 1
                  : (all.indexOf(tab) +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      all.length) %
                    all.length;
          all[next].click();
          all[next].focus();
        });
        nav.append(tab);
      }
      sections.append(nav, contributions, favorites);
      content.append(sections);
      if (!data.comments.length)
        contributions.append(
          element(
            "p",
            "empty-social",
            "Este perfil ainda não tem comentários públicos.",
          ),
        );
      for (const c of data.comments) {
        const card = link(
          "",
          c.article_url + "#comentarios",
          "profile-contribution",
        );
        card.append(
          element("strong", "", c.article_title),
          element("p", "", c.body || "Comentário com imagem."),
          element(
            "small",
            "",
            date(c.created_at) +
              (c.kind === "correction" ? " · Sugestão de correção" : ""),
          ),
        );
        contributions.append(card);
      }
      if (p.show_favorites) {
        if (!data.favorites.length)
          favorites.append(
            element(
              "p",
              "empty-social",
              "Nenhum favorito público neste perfil.",
            ),
          );
        else {
          const search = await fetch("/data/search.json").then((r) => r.json());
          const byId = new Map(
            search.map((item: any) => [item.favorite_id, item]),
          );
          for (const id of data.favorites) {
            const item: any = byId.get(id);
            if (item)
              favorites.append(
                link(item.title, item.url, "profile-contribution"),
              );
          }
        }
      }
      status(message, "");
      content.hidden = false;
    } catch (error) {
      status(message, errorText(error), true);
      message.append(
        document.createTextNode(" "),
        link("Voltar à comunidade", "/pessoas/", "text-link"),
      );
    }
  }
  load();
}
