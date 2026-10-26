# Redesign — decisões e execução

> **Arquivado em 26/10/2026:** o responsável suspendeu a reformulação do site por tempo indeterminado. O site público ficará apenas com fundo desfocado e **Em breve / Coming soon**, até ele pedir a retomada. Os dois chats trabalharão somente no bot após a publicação dessa tela. As decisões abaixo são histórico e não autorizam alterações no site. Estado vigente: [CONTINUIDADE.md](../CONTINUIDADE.md).

Autorizado pelo responsável em 26/10/2026, depois da discussão do conceito. Esta especificação complementa `CONTINUIDADE.md`, a auditoria e o código existente. Todas as sugestões estão preservadas abaixo por assunto; sugestões equivalentes foram reunidas. Alternativas de abertura, paleta e prioridade continuam documentadas, com a escolha vigente explicitada.

## Decisões vigentes

- Wiki e comunidade de Anime Adventures, com identidade futurista própria. A wiki é a entrada principal; a comunidade participa da página inicial e tem área própria. Referências de outros sites servem para avaliar acabamento, sem reproduzir sua identidade.
- Abertura cinematográfica com pesquisa e atalhos disponíveis imediatamente. Sem espera obrigatória, sequência de introdução ou áudio automático. Nenhum protagonista único representa o projeto.
- Tema Adventures padrão, relacionado às artes e cores do jogo; temas escuro e claro com o mesmo cuidado. A proposta inicial de azul-noite/violeta/ciano é referência de trabalho, sujeita às artes e ao contraste, não uma obrigação de usar cores sem contexto.
- pt-BR/en-US naturais e profissionais, sem gírias, fantasia ou marketing exagerado. Tipografia pode ser expressiva; rótulos e descrições devem ser objetivos.
- Nada de emojis nos controles. Vetores consistentes para ações, artes documentadas nos conteúdos. O mesmo comando conserva seu símbolo.
- Cenários decorativos distribuídos por destino, sem repetir fundo em banner e blocos da mesma página. Preferir também cenários diferentes entre áreas. Ilustrações de artigos, avatares e retratos identificam conteúdo e preservam suas fontes e identidades.
- Dados, artes, créditos, contas, publicações e URLs existentes preservados. Não recriar o projeto, trocar retratos por aproximações ou publicar fixtures.
- Workers Free e D1 existentes. Nenhum serviço pago ou custo novo autorizado. Publicação direta no site oficial já autorizada; registrar evidências de cada etapa.
- Posts com texto/foto, comentários, perfis, amizades e moderação continuam. Vídeos em posts, chat global, mensagens privadas, curtidas e ponte com o bot continuam fora desta etapa. A pergunta sobre organizar um servidor Discord foi uma consulta de capacidade, não autorização para alterar servidores.

## Rastreabilidade

Estados: **entrega** = implementar/conferir neste ciclo; **preservar** = capacidade existente que precisa continuar; **etapa IA** = planejamento futuro expressamente discutido, sem contratação ou execução automática nesta entrega. O resultado efetivamente validado e publicado fica em `CONTINUIDADE.md`.

| ID | Pedido/recomendação acumulada | Aplicação e verificação | Estado |
|---|---|---|---|
| V01 | Identidade própria e reconhecível | Assinatura gráfica, formas, proporções, tipografia, cores e controles comuns; conferir início, artigo e comunidade juntos | entrega |
| V02 | Abertura expressiva e útil | Cenário único, conjunto de personagens, profundidade, busca e acessos no primeiro conteúdo | entrega |
| V03 | Inventário e distribuição das imagens | `source/art-direction.json`, origem, dimensão e destino; sem cenários decorativos duplicados entre destinos reservados | entrega |
| V04 | Composição distinta por conteúdo | Início, consulta, artigos, mapa, feed e perfil com hierarquia adequada à função | entrega |
| V05 | Imagens integradas e enquadradas | Cortes próprios em celular/computador, proporções e espaço reservado; nenhuma alteração nos arquivos originais | entrega |
| V06 | Ritmo, respiro e espaçamento | Margens e alinhamento compartilhados, áreas de leitura tranquilas e apresentações com presença | entrega |
| V07 | Temas Adventures/escuro/claro | Superfícies, foco, erros, seleção e controles legíveis nos três temas; preferência persistente | entrega/preservar |
| V08 | Tipografia e redação | Títulos expressivos, textos confortáveis e rótulos naturais nos dois idiomas | entrega |
| V09 | Movimento coerente e contínuo | Transições entre páginas/controles e retrato exato quando suportado; links nativos e fallback | entrega |
| V10 | Preferências de acessibilidade | Movimento reduzido, efeitos opcionais, som desligado inicialmente; sem animação essencial para acessar informação | preservar |
| V11 | Ícones bem desenhados | Mesma espessura e alinhamento; nomes acessíveis para controles, vetores nas ações | entrega |
| V12 | Acabamento em todos os estados | Carregamento, vazio, erro, falha de imagem, conteúdo extenso, avatar indisponível e foco | entrega/preservar |
| V13 | Celular com composição própria | Pesquisa visível, áreas de toque, teclado, menus, diálogos, fotos e abertura vertical | entrega |
| V14 | Desempenho em aparelhos comuns | Imagens com dimensões, carregamento progressivo, efeitos leves, pausa fora da tela e respeito à economia de dados | entrega |
| V15 | Rodapé, créditos e fontes | Borda de largura completa, alinhamento e leitura; preservar atribuição e condições de uso | entrega/preservar |
| Q01 | Pesquisa fácil e nomes alternativos | Pesquisa global e catálogo, normalização de acentos, índices localizados e aliases documentados | preservar |
| Q02 | Contexto ao voltar | Filtros/ordenação no endereço, quantidade carregada no histórico, restauração de navegação e consultas recentes locais apagáveis | entrega |
| Q03 | Ficha rápida, comparação e favoritos | Preservar acesso, até três personagens, idioma/seleções compartilháveis e autoria das coleções | preservar |
| Q04 | Formas, evolução, atributos e requisitos | Fonte original preservada, widgets utilizáveis e etapas independentes do idioma | preservar |
| Q05 | Mapa útil e honesto | Marcadores, zoom, descrições localizadas, aviso de origem comunitária e diferença possível do jogo atual | preservar |
| Q06 | Fontes e datas compreensíveis | Fonte/revisão acessíveis no cabeçalho do artigo e créditos; data da fonte não apresentada como atualização do jogo | entrega |
| Q07 | Vocabulário consistente | Dicionários de interface/glossário, nomes próprios protegidos e números conferidos contra a origem | entrega/preservar |
| Q08 | Descoberta e compartilhamento | Título/descrição/canonical/hreflang e imagem específica em prévias; conteúdo público indexável apropriado | entrega |
| Q09 | URLs existentes e consulta pública | Rotas antigas redirecionadas, conteúdo público sem exigir login, links profundos e histórico preservados | preservar |
| S01 | Wiki e comunidade relacionadas | Publicações vinculadas opcionalmente a artigo, acesso ao assunto e feed por artigo | entrega |
| S02 | Comunidade presente desde o início | Prévia real, área própria e acesso aos jogadores; nenhum perfil/post fictício para preencher vazios | entrega |
| S03 | Feed, posts e perfis valorizados | Foto proporcional e ampliável, autoria/data/ações claras, capas, bio e contribuições no perfil | entrega/preservar |
| S04 | Rascunhos e recuperação | Texto por identidade/assunto na aba, recuperação após recarga, limpeza ao publicar/sair; foto reescolhida explicitamente | entrega |
| S05 | Login e sessão | Retorno ao destino, erros explicados e trabalho preservado em falhas; OAuth humano exige conferência real | preservar |
| S06 | Envio de fotos | Prévia, remoção, limites, compressão existente, ordenação de respostas e confirmação de resultado | preservar |
| S07 | Privacidade compreensível | Perfil e favoritos com visibilidade explícita, autoria no servidor e exclusão de conta/dados | preservar |
| S08 | Moderação e regras | Denúncias com contexto/foto, sugestões de correção, revisão, diretrizes claras e autorizações no servidor | preservar |
| S09 | Amizades e participação | Solicitar/aceitar/cancelar/remover e feed de amigos; confirmações corretas e recuperação de falhas | preservar |
| T01 | Código visual sustentável | Regras atuais centralizadas, componentes comuns e origem arquivada intacta | entrega |
| T02 | Avaliação em situações reais | Temas/idiomas/larguras, nomes/textos longos, proporções de fotos, teclado, toque e falhas simuladas localmente | entrega |
| T03 | Preservação e recuperação | Histórico Git, alterações aditivas, sem reset forçado; manter dados e artefatos de origem | entrega/preservar |
| T04 | Continuidade entre os chats | Requisitos, arquivos, decisões, dependências, testes e estado de commit/push/CI/site no registro compartilhado | entrega |
| T05 | Uso com pouca coleta de dados | Métricas existentes da Cloudflare; nenhum rastreamento pessoal novo. Buscas sem resultado poderão ser avaliadas com uma política e coleta própria posterior | preservar/planejado |
| IA01 | Monitorar novidades oficiais e comunitárias | Definir fontes, horários e detecção de alterações; evidências comunitárias exigem confirmação | etapa IA |
| IA02 | Atualização editorial assistida | Proposta com fonte/data, comparação, revisão de valores/requisitos, conflitos sinalizados e histórico recuperável | etapa IA |
| IA03 | Cotas e custos da automação | Escolher serviço e orçamento gratuito verificáveis antes de ativar; monitoramento não equivale a modelo que aprende autonomamente | etapa IA |

## Implementação e manutenção

- `src/styles/redesign.css`: direção visual vigente; widgets funcionais/source herdam a base existente.
- `source/art-direction.json`: distribuição de cenários documentados; atualizar o inventário antes de reservar novos fundos.
- `src/components/WikiHome.astro`, `src/layouts/Layout.astro`: composição, navegação, metadados e páginas.
- `src/scripts/experience.ts`, `drafts.ts`, `catalog.ts`: transições, fotos, recuperação, consultas recentes e contexto.
- `migrations/0004_post_topics.sql`, `worker/social.mjs`: vínculo opcional, validado e transacional entre publicações e artigos.
- `tests/redesign.test.mjs`, `tests/browser/redesign.py`: migração, privacidade, associação, rascunhos e novas interações.
- Não anunciar todos os pontos como concluídos por existir esta tabela. Confirmar implementação e validação no encerramento do ciclo. As fases futuras permanecem registradas.
