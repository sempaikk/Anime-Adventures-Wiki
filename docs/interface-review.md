# Revisão da interface · 24/10/2026

Esta etapa aplica a direção combinada: cantos arredondados, navegação confortável e arte do jogo. A grade espacial, os marcadores de coordenadas, a varredura e as quatro persianas de transição foram retirados da apresentação. Cenários, seleção de formas, efeitos de interação, controles de movimento, busca, filtros e ferramentas permanecem.

`adventures-ui.css` é a camada de composição e acabamento depois dos estilos existentes. O cabeçalho mantém a trilha de leitura contida. A navegação principal, o menu completo e os atalhos móveis substituem a duplicação da navegação lateral fixa. As páginas continuam com composições próprias para catálogo, artigo, comparação e comunidade.

A coluna do personagem acompanha a rolagem do documento, sem sua antiga rolagem interna. O título da infobox recebe dimensões e espaçamento explícitos. Diálogos longos continuam roláveis, com barras nativas personalizadas e funcionamento normal de teclado, toque e roda do mouse. Os controles usam emojis quando ajudam a identificar uma ação; setas decorativas dos cartões foram reduzidas.

Os retratos preservam todos os arquivos originais. `portrait-framing.css` registra somente suas margens transparentes, calculadas por `python scripts/frame_portraits.py` com Pillow. O enquadramento CSS é limitado aos displays de personagens; capturas dos artigos não são recortadas. Navegadores sem `object-view-box` preservam a imagem inteira.

O som começa habilitado na primeira visita, com volume inicial de 25%, e é preparado na primeira interação válida do navegador. A preferência salva de silêncio prevalece. A preferência de movimento continua respeitando a escolha salva e a redução de movimento do sistema.

O importador agora compara a raridade pela identidade exata em `Module:UnitData/Data`, conferindo o hash da revisão preservada. `source/unit-data-audit.json` registra cobertura, correções e as identidades sem correspondência. Categorias de artigos não substituem os valores disponíveis nesse módulo. Quando a identidade não consta nele, um artigo da mesma revisão pode confirmar a raridade por uma declaração explícita no início do texto para o nome exato daquela forma. As identidades sem correspondência mantêm os dados anteriores, sem supor uma raridade.

A conferência encontrou 498 identidades no módulo e mais 13 confirmadas explicitamente nos artigos: 511 de 555 identidades do arquivo, com 60 correções ou preenchimentos de raridade. As 44 restantes continuam identificadas como pendentes; essa contagem inclui o arquivo histórico. Nenhuma fonte bruta ou arte foi substituída nessa revisão.

Os registros públicos das atualizações do bot deixam de apresentar links para commits. O programa do bot permanece sem alterações. Os termos e a política do bot continuam em `/bot/termos/` e `/bot/privacidade/`.

## Próximas etapas já discutidas

O idioma por país e a interface completa em pt-BR/en-US ainda precisam de implementação própria. A tradução dos artigos deve preservar nomes oficiais, números, fontes e a indicação do idioma original. O estudo audiovisual do jogo e a exploração visual de evoluções e materiais também permanecem como etapas seguintes; esta revisão não anuncia esses recursos como concluídos.

## Validação

- 47 testes automatizados aprovados, incluindo regressões de imagens duplicadas, identidade, fontes, contas e dados de personagens.
- 686 documentos conferidos no Chromium em larguras de 320 e 1440 px: 1.372 combinações, sem transbordamento horizontal, títulos da infobox fora do painel, rolagem interna da coluna do personagem ou erros JavaScript não tratados.
- Mais 168 combinações de páginas principais, com larguras de 320, 390, 768 e 1440 px e temas Adventures, Escuro e Claro, sem falhas de alinhamento ou erros JavaScript.
- 30 verificações de interação: som inicial, ausência de contexto de áudio antes de gesto, início após interação, silêncio persistido, movimento reduzido, seleção de forma, retrato contido, ficha rápida, navegação e imagem única de Traits.
- Fluxo da comunidade conferido com os handlers reais do Worker, SQLite em memória e identidade sintética: perfil, diretório, comentários e respostas. Não representa uma nova autorização OAuth humana nem atividade publicada em produção.
- Auditoria de links e imagens e empacotamento do Worker verificados separadamente. A revisão final dos dados é recompilada antes de publicar; as duas raridades adicionais recebem uma conferência direcionada depois dessa compilação.
