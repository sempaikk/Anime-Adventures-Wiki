# Revisão de qualidade — outubro de 2026

Este documento acompanha os 34 pontos da auditoria de 26/10/2026. A direção definida pelo responsável é linguagem natural e profissional em pt-BR/en-US, sem gírias, fantasia ou chamadas exageradas. A identidade futurista e as artes documentadas de Anime Adventures continuam como referência visual.

| Ponto | Correção aplicada |
| --- | --- |
| 1 | Rodapé com superfície e borda em toda a largura. |
| 2 | Abertura, seções, conteúdo e rodapé compartilham largura e margens. |
| 3 | Ações dos cartões ficam no rodapé de cada cartão, inclusive com nomes longos. |
| 4 | Convite da comunidade acompanha seu próprio conteúdo, sem se esticar com as fotos do feed. |
| 5 | Escala de leitura ampliada nos rótulos, datas, créditos, raridades e informações auxiliares; identificação redundante sob o logo removida. |
| 6 | Cores de erro respeitam o tema; busca e rótulos sobre imagens revisados. |
| 7 | Cabeça e corpo do ícone de pessoa alinhados. |
| 8 | Setas internas e indicação de links externos diferenciadas. |
| 9 | Chamadas da abertura, comunidade, formulários e estados vazios substituídas por textos funcionais. |
| 10 | Singular e plural completos em português e inglês. |
| 11 | Filtro “Todos” traduzido como “All”. |
| 12 | Favoritos usam o índice do idioma; pontos do mapa têm descrições revisadas em português e original inglês. |
| 13 | Controles próprios dentro dos artigos são traduzidos sem incluir a prosa ou conteúdo dos jogadores nesse processo. |
| 14 | Confirmações nativas usam o idioma escolhido. |
| 15 | Rótulos acessíveis e conteúdo sem JavaScript incluídos na localização. |
| 16 | Diretório identificado como “Jogadores”, separado da “Comunidade”. |
| 17 | Link antigo dos canais e descrição do projeto/privacidade atualizados. |
| 18 | “Explorar a wiki” abre a biblioteca. |
| 19 | Etapas identificadas por dados estruturais, independentes do idioma dos títulos. Vocabulário de etapa em português revisado. |
| 20 | Comparação preserva o idioma no endereço e no compartilhamento. |
| 21 | Atalho sem destino deixa de ser um controle; seu texto é preservado. |
| 22 | Históricos vazios têm explicação, sem criar notas de lançamento fictícias. |
| 23 | Menu de publicação fecha com clique fora, Esc ou abertura de outro menu. |
| 24 | Confirmação da remoção de amizade descreve a ação correta. |
| 25 | Edição e denúncia permanecem abertas com o texto disponível quando a API falha; envio duplicado bloqueado enquanto a ação está pendente. |
| 26 | Revisão de denúncias apresenta a foto, com acesso restrito à moderação no servidor. |
| 27 | Seleções de imagem têm controle de versão; respostas atrasadas não substituem a escolha mais recente. O reset também invalida envios antigos. |
| 28 | Falha ao consultar o perfil tem explicação e nova tentativa, preservando a identificação da sessão. |
| 29 | Links de avatar recebem nome acessível, preservando o nome do jogador. |
| 30 | Erros do feed permanecem na região de aviso; carregamento de mais publicações pode ser repetido após uma falha. |
| 31 | Exclusão restaura o foco a uma publicação restante ou ao feed. |
| 32 | Opção inicial do seletor de artigos tem valor vazio e respeita a validação obrigatória. |
| 33 | Reservas de favoritos, importação e comentários de artigos são atômicas. Importações que não cabem são recusadas integralmente; operações idempotentes continuam funcionando no limite. |
| 34 | Regras dos componentes corrigidos centralizadas no estilo atual, formatado para revisão. Controles vazios removidos após a tradução. A folha CSS arquivada da fonte permanece intacta. |

As folhas anteriores ainda fornecem a estrutura dos widgets existentes. Suas regras não foram removidas indiscriminadamente. Arquivos brutos, artes, nomes de formas, valores do jogo, créditos e versões de origem continuam preservados.

## Verificação

- `npm test`: testes existentes e regressões novas de concorrência, importação integral, privacidade de denúncias com foto, identidade das etapas, traduções e navegação interna.
- `npm run build`, localização, auditoria dos documentos e Wrangler `deploy --dry-run` em cópia descartável.
- `tests/browser/quality.py`: duas passagens dos fluxos críticos e 225 combinações de tela/tema/largura, com sessões SQLite locais. Instruções em `tests/browser/README.md`.
- Varredura adicional das rotas e conferência dos números do conteúdo traduzido contra a origem.

Os resultados e o estado efetivo da publicação ficam em `CONTINUIDADE.md`. A autorização humana pelo Discord, outros motores de navegador e aparelhos físicos exigem conferências separadas. Nenhuma conta ou publicação sintética pode ser enviada à produção.
