import official from "../../source/official-links.json";
export const channels = [
  {
    key: "roblox",
    name: "Jogar no Roblox",
    platform: "Roblox",
    label: "Jogar",
    url: official.roblox.url,
    description:
      "Abra a página do jogo no Roblox. Desenvolvido por Gomu.",
  },
  {
    key: "youtube",
    name: "Gomu",
    platform: "YouTube",
    label: "Ver YouTube",
    url: official.youtube.url,
    description: "Encontre os vídeos e as publicações do canal dos criadores.",
  },
  {
    key: "discord",
    name: "Servidor do jogo",
    platform: "Discord",
    label: "Entrar no Discord",
    url: official.discord.url,
    description:
      "O servidor oficial do jogo, com conversas e informações da comunidade.",
  },
];
export const botInvite =
  "https://discord.com/oauth2/authorize?client_id=1561527465657114644&scope=bot+applications.commands&permissions=378494110720&integration_type=0";
export function rarityTone(value = "") {
  const name = value.toLowerCase();
  return name.includes("secret")
    ? "secret"
    : name.includes("mythic")
      ? "mythic"
      : name.includes("legendary")
        ? "legendary"
        : name.includes("epic")
          ? "epic"
          : name.includes("rare")
            ? "rare"
            : name.includes("exclusive")
              ? "exclusive"
              : "neutral";
}
