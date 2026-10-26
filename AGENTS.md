# Continuidade entre assistentes

**Estado vigente em 26/10/2026:** o site fica somente com a tela **Em breve / Coming soon por tempo indeterminado, até o responsável pedir a retomada**. Concluir apenas a publicação desta tela já solicitada. Depois, os dois chats trabalham **somente no bot** `sempaikk/Anime-Adventures`; não alterar arquivos, configuração ou publicação deste site sem nova instrução explícita. Planos de redesign abaixo e na documentação são histórico, não autorização para retomar.

Antes de trabalhar, leia [CONTINUIDADE.md](CONTINUIDADE.md) e a especificação vigente [docs/REDESIGN.md](docs/REDESIGN.md). Ele reúne as decisões do responsável, o estado do site e as pendências entre os dois chats.

- Confira `git status` e a versão de `origin/main` antes de editar. Preserve mudanças locais e trabalho do outro assistente; nunca use reset destrutivo ou push forçado para sincronizar.
- Use o checkout existente. As tarefas na nuvem já são isoladas; não crie Git worktree sem pedido explícito.
- Instruções explícitas mais recentes do usuário prevalecem sobre decisões antigas da documentação. Se o escopo mudar, atualize o arquivo de continuidade.
- Mantenha o Cloudflare Workers Free e o banco D1 existente. Não habilite serviços pagos, R2, planos ou novos custos sem autorização.
- Preserve os dados e as artes documentadas de Anime Adventures, os créditos, as identidades das formas e as preferências de acessibilidade. A identidade visual é futurista e própria de Anime Adventures. Não use emojis como ícones da interface.
- Não publique contas, sessões ou conteúdo de teste no banco de produção. Fixtures isoladas dos testes são permitidas. Nunca registre segredos em código, logs ou conversa.
- Distinga instalação local, commit, envio ao GitHub, build da Cloudflare e conferência do site no ar. Não anuncie uma etapa como concluída sem evidência.
- Ao encerrar cada ciclo, atualize `CONTINUIDADE.md` no mesmo conjunto de alterações: mudanças, arquivos importantes, testes efetivamente executados, estado da publicação e próximo passo. Mantenha o resumo vigente e acrescente uma entrada curta no histórico.

O projeto relacionado do bot é `sempaikk/Anime-Adventures`. Consulte as instruções daquele repositório antes de trabalhar nele e registre também aqui mudanças que afetem os dois projetos.
