import {currentLocale,localPath} from './i18n';

export async function communityApi(
  path: string,
  method = "GET",
  data?: unknown,
) {
  const response = await fetch("/api/community" + path, {
    method,
    credentials: "same-origin",
    headers: data !== undefined ? { "Content-Type": "application/json" } : {},
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  let result: any;
  try {
    result = await response.json();
  } catch {
    throw Error("Não foi possível carregar os dados. Tente novamente.");
  }
  if (!response.ok)
    throw Object.assign(
      Error(result.error || "Não foi possível concluir agora."),
      { status: response.status },
    );
  return result;
}
export const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
export function link(text: string, href: string, className = "") {
  const directional = /\s*↗[\uFE0E\uFE0F]?$/u.test(text);
  const node = element(
    "a",
    className,
    directional ? text.replace(/\s*↗[\uFE0E\uFE0F]?$/u, "") : text,
  );
  if (directional) {
    node.classList.add("has-direction");
    const arrow = element("span", "ui-direction", "↗️");
    arrow.setAttribute("aria-hidden", "true");
    node.append(arrow);
  }
  node.href = localPath(href);
  return node;
}
export function contentElement<K extends keyof HTMLElementTagNameMap>(tag:K,className="",text:string|null|undefined="",fallback="") {
  const node=element(tag,className,text||fallback);
  if(text){node.dataset.noTranslate="";node.setAttribute('translate','no')}
  return node;
}
export function contentLink(text:string|null|undefined,href:string,className="",fallback="") {
  const node=contentElement('a',className,text,fallback);
  node.href=localPath(href);
  return node;
}
export function picture(src: string | null, alt: string, className = "") {
  if (!src) return element("span", className);
  const img = element("img", className);
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  return img;
}
export const date = (seconds: number) =>
  new Date(seconds * 1000).toLocaleDateString(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function status(node: HTMLElement, text: string, error = false) {
  node.textContent = text;
  node.dataset.error = String(error);
  node.hidden = !text;
}
export function action(
  text: string,
  run: (button: HTMLButtonElement) => Promise<void> | void,
  className = "button button-outline",
) {
  const button = element("button", className, text);
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await run(button);
    } finally {
      button.disabled = false;
    }
  });
  return button;
}
export async function uploadImage(
  file: File,
  kind: "avatar" | "banner" | "comment" = "comment",
) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  )
    throw Error(
      "Escolha uma imagem PNG, JPG ou WebP de até 12 MB. Vídeos e imagens animadas não são aceitos.",
    );
  const bitmap = await createImageBitmap(file);
  const max = kind === "avatar" ? 512 : 1600;
  let width = bitmap.width,
    height = bitmap.height;
  if (!width || !height || width * height > 45000000) {
    bitmap.close();
    throw Error("Esta imagem é grande demais. Escolha uma versão menor.");
  }
  const canvas = document.createElement("canvas"),
    context = canvas.getContext("2d")!;
  const scale = Math.min(1, max / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82 - attempt * 0.09),
    );
    if (blob && blob.size <= 170000) break;
    width *= 0.8;
    height *= 0.8;
  }
  bitmap.close();
  if (!blob || blob.size > 180000)
    throw Error(
      "Não foi possível reduzir esta imagem. Escolha uma versão menor.",
    );
  const response = await fetch("/api/community/media", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": blob.type },
    body: blob,
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(result.error || "Não foi possível enviar a imagem.");
  return result;
}
