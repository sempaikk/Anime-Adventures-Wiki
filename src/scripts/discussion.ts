import {contentElement,contentLink} from './community-client';
import {
  communityApi,
  element,
  link,
  picture,
  date,
  status,
  uploadImage,
} from "./community-client";
const resolution: any = {
  open: "Aguardando revisão",
  reviewing: "Em revisão",
  resolved: "Revisão concluída",
  declined: "Não aplicada",
};
let viewer: HTMLDialogElement | undefined;
function viewImage(url: string) {
  if (!viewer) {
    viewer = element("dialog", "image-viewer");
    viewer.setAttribute("aria-label", "Imagem do comentário");
    const close = element("button", "button button-outline", "Fechar imagem");
    close.type = "button";
    close.addEventListener("click", () => viewer!.close());
    viewer.append(close, element("img"));
    document.body.append(viewer);
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer) {
        const r = viewer!.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          viewer!.close();
      }
    });
  }
  const image = viewer.querySelector("img")!;
  image.src = url;
  image.alt = "Imagem enviada no comentário";
  viewer.showModal();
}
for (const box of document.querySelectorAll<HTMLElement>(
  "[data-editorial-notes]",
)) {
  const article = box.dataset.editorialNotes!;
  communityApi("/notes?article=" + encodeURIComponent(article))
    .then((result) => {
      if (!result.notes.length) return;
      box.hidden = false;
      for (const note of result.notes) {
        const item = element("section", "editorial-note");
        item.append(
          element("span", "eyebrow", "REVISÃO DO SITE"),
          contentElement("h2", "", note.title),
          contentElement("p", "", note.body),
        );
        const when = element("time", "", date(note.updated_at));
        when.dateTime = new Date(note.updated_at * 1000).toISOString();
        const source = link("Fonte consultada ↗︎", note.source_url);
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        item.append(when, source);
        if (result.moderator) {
          const remove = element("button", "plain-button", "Retirar nota");
          remove.type = "button";
          remove.style.marginLeft = "20px";
          remove.addEventListener("click", async () => {
            if (!confirm("Retirar esta nota do artigo?")) return;
            remove.disabled = true;
            try {
              await communityApi("/notes/" + note.id, "DELETE");
              item.remove();
              if (!box.children.length) box.hidden = true;
            } catch (error) {
              remove.textContent = (error as Error).message;
              remove.disabled = false;
            }
          });
          item.append(remove);
        }
        box.append(item);
      }
    })
    .catch(() => {
      /* Source content stays readable if the optional review layer is offline. */
    });
}

for (const section of document.querySelectorAll<HTMLElement>(
  "[data-discussion]",
)) {
  const article = section.dataset.discussion!,
    message = section.querySelector<HTMLElement>("[data-discussion-status]")!,
    entry = section.querySelector<HTMLElement>("[data-discussion-entry]")!,
    list = section.querySelector<HTMLElement>("[data-thread-list]")!,
    more = section.querySelector<HTMLButtonElement>("[data-discussion-more]")!;
  let access = { can_comment: false, logged_in: false, moderator: false },
    next: string | null = null,
    started = false,
    loading = false;
  const error = (error: unknown) =>
    status(
      message,
      (error as Error).message || "Não foi possível concluir agora.",
      true,
    );
  function button(
    text: string,
    handler: () => Promise<void> | void,
    className = "",
  ) {
    const value = element("button", className, text);
    value.type = "button";
    value.addEventListener("click", async () => {
      value.disabled = true;
      try {
        await handler();
      } catch (e) {
        error(e);
      } finally {
        value.disabled = false;
      }
    });
    return value;
  }
  function composer(
    parent: string | null,
    onDone: () => Promise<void>,
    existing?: any,
  ) {
    const form = element("form", "comment-composer");
    const label = element(
        "label",
        "",
        existing
          ? "Editar comentário"
          : parent
            ? "Sua resposta"
            : "Seu comentário",
      ),
      textarea = element("textarea");
    textarea.maxLength = 4000;
    textarea.rows = 4;
    textarea.value = existing?.body || "";
    textarea.placeholder = parent
      ? "Escreva sua resposta…"
      : "Compartilhe uma dica, dúvida ou correção…";
    label.append(textarea);
    form.append(label);
    let kind: HTMLSelectElement | undefined;
    if (!parent && !existing) {
      const kindLabel = element("label", "", "Tipo de comentário");
      kind = element("select");
      kind.name = "kind";
      for (const [value, text] of [
        ["discussion", "Conversa ou dúvida"],
        ["correction", "Sugerir correção"],
      ]) {
        const option = element("option", "", text);
        option.value = value;
        kind.append(option);
      }
      kindLabel.append(kind);
      form.append(kindLabel);
    }
    const preview = element("img", "composer-preview");
    preview.alt = "Prévia da imagem selecionada";
    preview.hidden = !existing?.image;
    if (existing?.image) preview.src = existing.image;
    form.append(preview);
    let imageId = existing?.image_id || null,
      uploading = false;
    const controls = element("div", "composer-actions"),
      uploadLabel = element("label", "upload-label", "Anexar imagem"),
      file = element("input");
    file.type = "file";
    file.accept = "image/png,image/jpeg,image/webp";
    uploadLabel.append(file);
    const actions = element("div", "account-actions"),
      submit = element(
        "button",
        "button button-primary",
        existing
          ? "Salvar alteração"
          : parent
            ? "Responder"
            : "Publicar comentário",
      );
    submit.type = "submit";
    const removeImage = button(
      "Remover imagem",
      () => {
        imageId = null;
        preview.hidden = true;
        preview.removeAttribute("src");
        removeImage.hidden = true;
      },
      "plain-button",
    );
    removeImage.hidden = !imageId;
    actions.append(submit);
    if (parent || existing)
      actions.append(button("Cancelar", () => form.remove(), "plain-button"));
    controls.append(uploadLabel, actions);
    const notice = element("p", "composer-message");
    notice.setAttribute("role", "status");
    form.append(removeImage, controls, notice);
    file.addEventListener("change", async () => {
      const selected = file.files?.[0];
      if (!selected) return;
      uploading = true;
      submit.disabled = true;
      status(notice, "Ajustando e enviando imagem…");
      try {
        const uploaded = await uploadImage(selected);
        imageId = uploaded.id;
        preview.src = uploaded.url;
        preview.hidden = false;
        removeImage.hidden = false;
        status(notice, "Imagem pronta para publicar.");
      } catch (e) {
        status(notice, (e as Error).message, true);
      } finally {
        uploading = false;
        submit.disabled = false;
        file.value = "";
      }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (uploading) return;
      submit.disabled = true;
      status(notice, "Publicando…");
      try {
        const data = {
          article,
          body: textarea.value,
          image_id: imageId,
          parent_id: parent,
          kind: kind?.value,
        };
        await communityApi(
          existing ? "/comments/" + existing.id : "/comments",
          existing ? "PATCH" : "POST",
          data,
        );
        textarea.value = "";
        imageId = null;
        preview.hidden = true;
        removeImage.hidden = true;
        if (parent || existing) form.remove();
        else status(notice, "Comentário publicado.");
        await onDone();
      } catch (e) {
        status(notice, (e as Error).message, true);
      } finally {
        submit.disabled = false;
      }
    });
    return form;
  }
  function report(comment: any) {
    const dialog = element("dialog", "report-dialog");
    dialog.setAttribute("aria-label", "Denunciar comentário");
    const title = element("h2", "", "Denunciar comentário"),
      form = element("form", "report-form"),
      label = element("label", "", "Explique o motivo"),
      text = element("textarea");
    text.required = true;
    text.minLength = 5;
    text.maxLength = 300;
    text.rows = 4;
    label.append(text);
    const controls = element("div", "account-actions"),
      submit = element("button", "button button-primary", "Enviar denúncia");
    submit.type = "submit";
    controls.append(
      submit,
      button("Cancelar", () => dialog.close(), "button button-outline"),
    );
    const notice = element("p", "composer-message");
    notice.setAttribute("role", "status");
    form.append(label, controls, notice);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      try {
        await communityApi("/comments/" + comment.id + "/report", "POST", {
          reason: text.value,
        });
        dialog.close();
        status(message, "Denúncia enviada para revisão.");
      } catch (e) {
        status(notice, (e as Error).message, true);
      } finally {
        submit.disabled = false;
      }
    });
    dialog.append(title, form);
    dialog.addEventListener("close", () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
    text.focus();
  }
  function commentView(comment: any, reply = false) {
    const node = element("article", "comment");
    node.id = "comentario-" + comment.id;
    const header = element("header", "comment-header");
    header.append(
      picture(comment.author?.avatar || null, "", "comment-author-avatar"),
    );
    const who = element("div");
    who.append(
      comment.author
        ? contentLink(comment.author.name, comment.author.url, "comment-author-name")
        : element("span", "comment-author-name", "Perfil indisponível"),
    );
    const when = element(
      "time",
      "comment-time",
      date(comment.created_at) + (comment.edited ? " · editado" : ""),
    );
    when.dateTime = new Date(comment.created_at * 1000).toISOString();
    who.append(when);
    header.append(who);
    node.append(header);
    if (comment.kind === "correction")
      node.append(
        element(
          "span",
          "correction-status",
          "Sugestão de correção · " + resolution[comment.resolution],
        ),
      );
    node.append(
      comment.deleted ? element("p", "comment-deleted", "Comentário excluído pelo autor.") : contentElement("p", "comment-body", comment.body),
    );
    if (comment.image) {
      const view = button(
        "",
        () => viewImage(comment.image),
        "comment-image-button",
      );
      view.setAttribute("aria-label", "Ampliar imagem do comentário");
      view.append(picture(comment.image, "Imagem anexada ao comentário"));
      node.append(view);
    }
    const actions = element("div", "comment-actions"),
      replies = element("div", "comment-replies");
    replies.hidden = true;
    let replyNext: string | null = null,
      replyLoaded = false;
    async function loadReplies(append = false) {
      const result = await communityApi(
        "/comments/" +
          comment.id +
          "/replies" +
          (append && replyNext ? "?after=" + replyNext : ""),
      );
      if (!append) replies.replaceChildren();
      for (const c of result.comments) replies.append(commentView(c, true));
      replyNext = result.next;
      replies.querySelector("[data-more-replies]")?.remove();
      if (replyNext) {
        const nextButton = button(
          "Mais respostas",
          () => loadReplies(true),
          "plain-button",
        );
        nextButton.dataset.moreReplies = "";
        replies.append(nextButton);
      }
      replyLoaded = true;
      replies.hidden = false;
    }
    if (access.can_comment)
      actions.append(
        button("Responder", () => {
          if (node.querySelector(":scope > .comment-composer")) return;
          const form = composer(comment.parent_id || comment.id, async () => {
            if (reply) await load();
            else await loadReplies();
          });
          node.append(form);
          form.querySelector("textarea")!.focus();
        }),
      );
    if (!reply && comment.reply_count)
      actions.append(
        button(`Ver respostas (${comment.reply_count})`, async () => {
          if (replyLoaded) {
            replies.hidden = !replies.hidden;
            return;
          }
          await loadReplies();
        }),
      );
    if (comment.can_edit) {
      actions.append(
        button("Editar", () => {
          if (node.querySelector(":scope > .comment-composer")) return;
          const form = composer(comment.parent_id, () => load(), comment);
          node.append(form);
          form.querySelector("textarea")!.focus();
        }),
      );
      actions.append(
        button("Excluir", async () => {
          if (
            !confirm(
              "Excluir seu comentário? As respostas de outras pessoas serão mantidas.",
            )
          )
            return;
          await communityApi("/comments/" + comment.id, "DELETE");
          await load();
        }),
      );
    }
    if (access.logged_in && !comment.deleted && !comment.can_edit)
      actions.append(button("Denunciar", () => report(comment)));
    if (access.moderator)
      actions.append(
        button("Ocultar", async () => {
          if (!confirm("Ocultar este comentário da comunidade?")) return;
          await communityApi("/comments/" + comment.id + "/moderate", "POST", {
            moderation: "hidden",
          });
          await load();
        }),
      );
    node.append(actions);
    if (!reply) node.append(replies);
    return node;
  }
  function renderEntry() {
    entry.replaceChildren();
    if (access.can_comment) {
      entry.append(composer(null, () => load()));
      return;
    }
    const box = element("div", "discussion-entry");
    box.append(
      element(
        "p",
        "",
        access.logged_in
          ? "Publique seu perfil para participar. Você escolhe seu nome, capa e o que quer mostrar."
          : "Entre com Discord para comentar, responder e enviar imagens. A leitura da wiki continua aberta.",
      ),
    );
    box.append(
      link(
        access.logged_in ? "Configurar meu perfil" : "Entrar com Discord",
        access.logged_in
          ? "/conta/#perfil"
          : "/api/auth/discord?return_to=" +
              encodeURIComponent(location.pathname + "#comentarios"),
        "button button-outline",
      ),
    );
    entry.append(box);
  }
  async function load(append = false) {
    if (loading) return;
    loading = true;
    more.disabled = true;
    try {
      const result = await communityApi(
        "/comments?article=" +
          encodeURIComponent(article) +
          (append && next ? "&before=" + next : ""),
      );
      access = result;
      if (!append) {
        list.replaceChildren();
        renderEntry();
      }
      for (const comment of result.comments) list.append(commentView(comment));
      next = result.next;
      more.hidden = !next;
      status(
        message,
        list.children.length ? "" : "Ainda não há comentários neste artigo.",
      );
    } catch (e) {
      error(e);
      if (!entry.children.length)
        entry.append(
          button("Tentar novamente", () => load(), "button button-outline"),
        );
    } finally {
      loading = false;
      more.disabled = false;
    }
  }
  more.addEventListener("click", () => load(true));
  function start() {
    if (started) return;
    started = true;
    load();
  }
  if (
    location.hash === "#comentarios" ||
    location.hash.startsWith("#comentario-") ||
    !("IntersectionObserver" in window)
  )
    start();
  else {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(section);
  }
  addEventListener("hashchange", () => {
    if (location.hash === "#comentarios") start();
  });
}
