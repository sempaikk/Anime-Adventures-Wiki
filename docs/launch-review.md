# Revisão para lançamento — 25/10/2026

Esta etapa trata do site. O repositório e a execução do bot não foram alterados. Os históricos públicos de atualizações do site e do bot continuam vazios.

## Segurança aplicada

- Política CSP comum aos arquivos estáticos e às respostas do Worker. Scripts locais e os hashes dos três scripts iniciais do próprio site são permitidos; scripts arbitrários inline, atributos de evento, eval, plugins e frames são bloqueados. O build calcula os hashes depois da localização e rejeita atributos HTML executáveis. Estilos inline continuam permitidos porque controles e animações usam propriedades CSS dinâmicas. As animações originais dos artigos continuam disponíveis sob demanda no CDN da wiki, permitido somente no caminho de imagens do próprio jogo; esses arquivos não são duplicados na hospedagem.
- HTTPS com HSTS, proteção contra enquadramento, detecção incorreta de MIME, isolamento de origem, política de referência e bloqueio de permissões de câmera, microfone e localização. Respostas de conta/comunidade nunca são guardadas em cache compartilhado.
- Alterações com origem externa são recusadas antes de consultas ou leitura do corpo. Os limites nativos da Cloudflare atuam antes do OAuth, banco e uploads: API 240/min, autenticação 12/min, alterações 40/min e imagens 6/min, por identidade de IP e região. Chaves usam digest; o site não cria uma tabela de IPs. São limites contra abuso, não uma quota global nem garantia contra DDoS.
- JSON é limitado por bytes mesmo em transmissão fragmentada; valores primitivos, conteúdo malformado e tipos incorretos são recusados. PNG/WebP têm o contêiner, tamanho, assinatura, dimensões e ausência de animação conferidos. PNG inclui verificação de CRC. SVG, arquivos truncados e dados extras após o arquivo são recusados.
- Um novo login substitui a sessão anterior daquele navegador, preservando sessões dos outros dispositivos. Cookies continuam Secure, HttpOnly, SameSite=Lax e com prefixo __Host-. Só hashes de sessão são persistidos; tokens Discord são descartados/revogados.
- URLs de OAuth, cookies, erros SQL e conteúdo de usuários não são incluídos nos logs da aplicação. Logs automáticos de invocação e traces foram desabilitados para não registrar URLs de callback; erros usam apenas área e método.
- A dependência transitiva undici da ferramenta de publicação foi atualizada para 7.30.1. A integração contínua passa a conferir a auditoria de dependências e recusa alertas de nível moderado ou superior.

## Armazenamento

A publicação elimina somente cópias de imagens sem referências nos documentos, dados JSON, scripts, estilos e Worker. O arquivo de fontes, os créditos e os originais permanecem no repositório. A limpeza conferida retirou 526 arquivos do pacote publicado: 13.206.084 bytes (12,59 MiB).

Uma tarefa diária às 07:17 UTC (04:17 em Brasília) remove sessões expiradas e imagens sem vínculo com perfil ou comentário após 24 horas. Perfis privados, comentários ocultos aguardando revisão e rascunhos recentes são preservados. Comentários, perfis, favoritos e notas não são apagados por essa tarefa. O teto existente de 200 MB para anexos e o limite de 180 KB por arquivo continuam ativos.

## Interface e conteúdo público

O banner de Summon usa o arquivo oficial do Roblox que já estava preservado na coleção, com a origem registrada. A comunidade, a página inicial e os artigos excluem da rotação de fundo as imagens usadas em seus destaques. O retrato selecionado não reaparece na miniatura ativa; o cartão de catálogo da página inicial também deixa de repetir um retrato do carrossel. Controles secundários de listas repetidas usam texto, mantendo os ícones de navegação do jogo visíveis.

Imagens grandes dos artigos podem ser ampliadas, ajustadas à tela e vistas no tamanho original. Links para os arquivos na fonte continuam disponíveis; cliques modificados preservam a abertura do link original. O diálogo suporta teclado, Escape, abertura repetida e retorno do foco.

Há aviso traduzido para perda e recuperação de conexão. Requisições de dados têm limite de espera, incluindo leitura do corpo; alterações não são reenviadas automaticamente. Os sons passam por um estágio de compressão para suavizar ações sobrepostas. Animações, preferências e alternativas para movimento reduzido são mantidas.

O catálogo deixa de mover cartões que já estão na ordem correta e de atualizar atributos sem mudança de estado. A localização reaproveita os textos já preparados pelo servidor e mantém um cache limitado para mensagens repetidas.

As páginas de conteúdo público ficam indexáveis, com URLs canônicas, versões de idioma, prévia social e sitemap. Contas, favoritos, perfis dinâmicos, comparação, históricos vazios, erros e páginas técnicas continuam sem indexação. Disponibilizar sitemap não garante prazo de inclusão nas buscas.

## Limites e operação

Esta revisão não é uma certificação nem uma promessa de invulnerabilidade. Atualizações de dependências, acompanhamento de erros e revisão de permissões continuam necessários. A configuração de 2FA dos responsáveis, recuperação da conta de hospedagem e restauração de backups do banco deve ser conferida no painel pelo responsável; não foi possível atestar esses controles externos pelo código.

Testes de contas e comunidade usam identidades isoladas e SQLite temporário. Não solicitam consentimento Discord em nome do usuário nem publicam comentários de teste no banco real. A conferência pública após a implantação verifica páginas, assets, APIs anônimas e os cabeçalhos reais.

## Conferências realizadas

- 72 testes automatizados passaram; auditoria de dependências sem alertas conhecidos na execução desta revisão.
- Auditoria do pacote: 2.059 documentos, 176.341 referências e 49.866 ocorrências de imagens; nenhuma falha ou aviso.
- 336 combinações das rotas principais, dois idiomas, quatro larguras e três temas: sem excesso horizontal, títulos de ficha fora do contêiner ou erros JavaScript.
- Ampliação de imagens, foco, zoom, conexão e CSP exercitados nos dois idiomas, com 320, 390 e 1440 px. Um script inline e um atributo de evento não autorizados foram efetivamente bloqueados pelo navegador; as interações legítimas continuaram funcionando.
- Perfis, comentários e respostas conferidos com handlers reais e banco temporário; conteúdo dos autores preservado.
- As 1.332 URLs do sitemap resolvem para documentos canônicos e mantêm os pares de idioma. Páginas privadas, técnicas e históricos vazios foram excluídos.
- O Worker passa na simulação de implantação com os quatro bindings de limitação e a tarefa agendada configurados.

O ensaio local de desempenho usa CPU 4× mais lenta, rede de 1,6 Mbps e compressão de texto, com efeitos ligados. A amostra mostrou estabilidade visual (CLS abaixo de 0,001), mas o primeiro carregamento em rede lenta ainda pode melhorar. Variantes mais leves dos ícones e logotipos são uma próxima otimização; não se atribuiu nota Lighthouse nem equivalência com medições de usuários reais.
