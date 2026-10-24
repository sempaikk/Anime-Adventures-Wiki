# Direção visual e estrutura

O site combina consulta de wiki e participação da comunidade, com uma interface própria inspirada nos cenários coloridos do jogo. A página inicial abre com arte real da wiki em camadas, personagem em destaque e três entradas: personagens, wiki e comunidade. Não imita o shell da Fandom nem uma rede social existente.

## Identidade

Azul profundo, ciano, violeta e verde formam o tema Adventures. Escuro reduz a iluminação; Claro usa superfícies claras e mantém contraste nos textos. Cenários de nave, cidade noturna e dungeon podem ser escolhidos na entrada. A marca aparece no cabeçalho, com textos funcionais no destaque e sem repetir o nome do jogo nas molduras. Imagens decorativas se dissolvem no fundo, enquanto retratos e seus avisos ficam contidos nos cartões. Controles de fechar usam traços geométricos centrados, independentes da fonte. As imagens editoriais são exclusivamente da wiki, sem geração por IA, redesenho de personagem ou artes externas. Origem e hashes estão em `source/interface-art.json`, `source/media-library.json` e `source/original-images.json`.

Inter serve à leitura e Oxanium aos títulos. Navegação usa palavras; símbolos são restritos a ações como busca, fechar, tema e indicação de destino. Não há emojis genéricos representando personagens ou categorias.

## Organização

- Cabeçalho compacto: marca, personagens, wiki, comunidade, busca, tema, conta e menu completo.
- Início: apresentação do jogo e entradas claras. Categorias adicionais e informações históricas se abrem por escolha do visitante.
- Catálogo: filtros, comparação, ficha rápida e acesso aos artigos. Retratos ausentes usam primeiro uma referência anterior documentada da mesma forma na wiki; a ausência é indicada quando essa referência também não está disponível.
- Artigo: título, fontes, conteúdo preservado, infobox, índice, estatísticas e comentários em uma seção própria. A leitura não é substituída por um feed.
- Comunidade: diretório de perfis publicados e pesquisa por pessoa.
- Perfil: capa, avatar, nome, identificador, biografia, campos opcionais, contribuições reais e favoritos somente se autorizados pelo titular.
- Conta: sincronização de favoritos, publicação explícita do perfil, controle de dados e saída.
- Revisão: sugestões de correção e denúncias. Somente o responsável configurado pode moderar ou publicar notas com fonte.

Perfis não têm postagens, amigos, grupos ou mensagens. Esses recursos e a ponte de chat com Discord ficam para futuras entregas, sem controles que finjam funcionar agora.

## Movimento e desempenho

Links e histórico continuam nativos. Transições diferenciam entrada, saída, retorno e abertura de artigo. Botões respondem ao clique; cartões reagem ao ponteiro; elementos abaixo da primeira tela entram ao serem alcançados. A cena inicial usa WebGL carregado sob demanda em dispositivos compatíveis, aplicando apenas um efeito de lente à imagem original; a imagem estática permanece como alternativa.

Movimento reduzido desliga animações, paralaxe e WebGL. Toque não depende de hover. O efeito da cena renderiza em resposta a eventos e não mantém um loop contínuo parado. A API de comentários só é consultada quando a seção se aproxima da tela. Busca, filtros, abas, menu e diálogos têm controles de teclado.

## Conteúdo e participação

Não inventar estatísticas, retratos, atualização do jogo ou atividade da comunidade. Os artigos preservam a revisão e os créditos da fonte. Notas de revisão do site aparecem separadas, com data e fonte consultada. Comentários não alteram o conteúdo enciclopédico diretamente.

Imagens fornecidas por participantes pertencem aos seus perfis e comentários; não são artes editoriais. A interface comprime os envios e o servidor verifica tamanho, formato, propriedade e visibilidade. Vídeos não são aceitos. Perfis e favoritos são privados até escolha explícita do titular.

## Validação

Conferir a apresentação em computador e celular, nos três temas e com movimento reduzido. Exercitar no navegador publicação e retirada de perfil, edição, anexos, respostas, denúncias, revisão e exclusão. Os testes usam contas e banco isolados; o consentimento humano real do Discord continua sendo conferido na produção pelo titular.
