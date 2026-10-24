import { communityApi, element, link, date, status } from "./community-client";
const page = document.querySelector<HTMLElement>("[data-review]");
if (page) {
  const message = page.querySelector<HTMLElement>("[data-review-status]")!,
    content = page.querySelector<HTMLElement>("[data-review-content]")!,
    corrections = page.querySelector<HTMLElement>("[data-review-corrections]")!,
    reports = page.querySelector<HTMLElement>("[data-review-reports]")!,
    form = page.querySelector<HTMLFormElement>("[data-note-form]")!,
    article = form.querySelector<HTMLSelectElement>("[name=article]")!,
    noteStatus = page.querySelector<HTMLElement>("[data-note-status]")!;
  function action(text: string, commentId: string, data: any) {
    const button = element("button", "button button-outline", text);
    button.type = "button";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await communityApi(
          "/comments/" + commentId + "/moderate",
          "POST",
          data,
        );
        await load();
      } catch (e) {
        status(message, (e as Error).message, true);
      } finally {
        button.disabled = false;
      }
    });
    return button;
  }
  async function load() {
    try {
      const data = await communityApi("/review");
      content.hidden = false;
      status(message, "");
      corrections.replaceChildren();
      reports.replaceChildren();
      if (!data.corrections.length)
        corrections.append(
          element("p", "empty-social", "Nenhuma sugestão aguardando revisão."),
        );
      if (!data.reports.length)
        reports.append(
          element("p", "empty-social", "Nenhuma denúncia aguardando revisão."),
        );
      for (const c of data.corrections) {
        const card = element("article", "review-card");
        card.append(
          link(c.article_title, c.article_url + "#comentarios", "text-link"),
          element("p", "", c.body),
          element(
            "small",
            "",
            date(c.created_at) +
              " · " +
              (c.resolution === "reviewing"
                ? "Em revisão"
                : "Aguardando revisão"),
          ),
        );
        if (c.image) {
          const a = link("Ver imagem anexada ↗︎", c.image, "text-link");
          a.target = "_blank";
          a.rel = "noopener";
          card.append(a);
        }
        const actions = element("div", "account-actions");
        actions.append(
          action("Revisar", c.id, { resolution: "reviewing" }),
          action("Concluir revisão", c.id, { resolution: "resolved" }),
          action("Não aplicar", c.id, { resolution: "declined" }),
        );
        const note = element(
          "button",
          "button button-outline",
          "Escrever nota no artigo",
        );
        note.type = "button";
        note.addEventListener("click", () => {
          article.value = c.article;
          document
            .getElementById("publicar-nota")!
            .scrollIntoView({ block: "start" });
          form
            .querySelector<HTMLInputElement>("[name=title]")!
            .focus({ preventScroll: true });
        });
        actions.append(note);
        card.append(actions);
        corrections.append(card);
      }
      for (const r of data.reports) {
        const card = element("article", "review-card");
        card.append(
          link(r.article_title, r.article_url + "#comentarios", "text-link"),
          element("p", "", "Denúncia: " + r.reason),
          element("p", "", r.body || "Comentário sem texto."),
        );
        const actions = element("div", "account-actions");
        actions.append(
          action("Ocultar comentário", r.comment_id, { moderation: "hidden" }),
          action("Encerrar denúncia", r.comment_id, { close_reports: true }),
        );
        card.append(actions);
        reports.append(card);
      }
    } catch (e) {
      status(message, (e as Error).message, true);
    }
  }
  communityApi("/me")
    .then(async (me) => {
      if (!me.moderator) {
        status(message, "Esta área é reservada à revisão do site.");
        message.append(
          document.createTextNode(" "),
          link("Voltar à wiki", "/biblioteca/", "text-link"),
        );
        return;
      }
      await load();
      const index = await fetch("/data/search.json").then((r) => r.json());
      const seen = new Set();
      article.replaceChildren(element("option", "", "Selecione um artigo"));
      for (const item of index.sort((a: any, b: any) =>
        a.title.localeCompare(b.title),
      )) {
        if (!item.favorite_id || seen.has(item.favorite_id)) continue;
        seen.add(item.favorite_id);
        const option = element("option", "", item.title);
        option.value = item.favorite_id;
        article.append(option);
      }
      const value = new URLSearchParams(location.search).get("article");
      if (value) article.value = value;
    })
    .catch((e) => status(message, (e as Error).message, true));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>("button")!;
    button.disabled = true;
    status(noteStatus, "Publicando nota…");
    try {
      await communityApi(
        "/notes",
        "POST",
        Object.fromEntries(new FormData(form)),
      );
      status(noteStatus, "Nota publicada no artigo.");
      for (const name of ["title", "body", "source_url"])
        (form.elements.namedItem(name) as HTMLInputElement).value = "";
    } catch (e) {
      status(noteStatus, (e as Error).message, true);
    } finally {
      button.disabled = false;
    }
  });
}
