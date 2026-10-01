# Kit CTO para Claude Code

Workflow em que uma sessão do Claude Code atua como **CTO**: faz triagem das demandas, cria issues no GitHub, escolhe o modelo pela dificuldade e despacha até **4 devs em paralelo**, cada um em seu próprio git worktree, abrindo PRs que são revisados antes de você decidir o merge.

## Instalação em qualquer projeto
1. Copie para a raiz do repo: `.claude/`, `CLAUDE.md`, `.worktreeinclude` e `scripts/setup-cto.sh`.
   - Se o projeto já tem `CLAUDE.md`, apenas acrescente as seções que faltam (comandos de verificação, convenções, banco).
2. Pré-requisitos: Claude Code atualizado, `gh` instalado e autenticado (`gh auth login`), remote no GitHub.
3. Rode `bash scripts/setup-cto.sh` (cria as labels e ajusta o .gitignore).
4. Preencha o `CLAUDE.md`.
5. Comite os arquivos na main, para que os worktrees dos agentes já os enxerguem.

## Uso
```bash
claude --model opus
```
```
/cto 1) botão de login quebrado no Safari 2) export CSV no dashboard 3) migrar tabela de pedidos para RLS por organização
```

## Agentes
O CTO escolhe **quem** pela área/tecnologia da issue (label `agent:`) e **o nível** pela dificuldade (label `difficulty:`), passando o `model` no despacho: easy → haiku, medium → sonnet, hard → opus. O `model:` no arquivo do agente é só o padrão. Roteamento completo em `.claude/commands/cto.md`, seção 2.

| Agente | Modelo padrão | Quando |
|---|---|---|
| esp-python | sonnet | código Python da coleta e da publicação |
| esp-scraping | sonnet | API da CBF, boletins em PDF, geocoding |
| esp-dados | sonnet | o que a coleta gera ou valida (CSVs, `dados.js`, caches) |
| esp-uiux | sonnet | interface do painel |
| esp-css | sonnet | estilo do painel |
| esp-a11y | sonnet | acessibilidade do painel; também revisa PRs do painel |
| esp-performance-web | sonnet | performance do painel; também revisa PRs do painel |
| esp-qa | sonnet | testes unitários e cobertura |
| esp-e2e | sonnet | testes Playwright do painel |
| esp-cicd | sonnet | `.github/workflows/`, só com pedido explícito |
| esp-appsec | opus | segurança; também revisa PRs com entrada externa, servidor ou segredos |
| arquiteto-software | opus | decisões técnicas e contratos entre áreas |
| tech-lead | opus | plano e quebra de issues grandes em issues paralelas |
| dev-junior / dev-pleno / dev-senior | haiku / sonnet / opus | genéricos (fallback) quando nenhum especialista encaixa |
| reviewer | sonnet | revisa todo PR (geral + clean code) e comenta (nunca aprova/mergeia) |

Skills do fluxo (`.claude/skills/`): `criar-issue` (CTO), `abrir-pr` e `atualizar-pr` (devs e especialistas), `revisar-pr` (revisores).
Modelos de especialistas para outras stacks ficam em `Claude-kit/agentes/` (índice e como ativar em `Claude-kit/agentes/README.md`). Para levar o workflow a outro projeto, use o kit genérico em `Claude-kit/` (instalação em `Claude-kit/README.md`).

## Ciclo de uma demanda
demanda → triagem (CTO: especialista + nível) → issue com labels (`criar-issue`) → especialista ou dev no worktree → PR `Closes #N` (`abrir-pr`) → `reviewer` + revisores especialistas do domínio ("Revise o PR #N") → ajustes na mesma branch (`atualizar-pr`) → você aprova e o CTO faz o merge.
Mudança em várias áreas: o `arquiteto-software` define a abordagem e o `tech-lead` quebra em issues sem arquivos em comum antes do despacho.
Se um agente perceber que a tarefa é maior que o nível dele ou fora do domínio, responde `ESCALAR` e o CTO redespacha (nível acima ou outro especialista).

## Dicas
- **Permissões:** para os devs em background não travarem pedindo aprovação, libere `git` e `gh` via `/permissions` no Claude Code (ou no `.claude/settings.json` do projeto).
- **Conflitos:** o CTO serializa tarefas que tocam os mesmos arquivos e roda no máximo uma migration por vez.
- **Custo:** a triagem em Opus vale a pena; se quiser economizar, rebaixe o `reviewer` para `haiku`.
- **Repos privados/monorepos:** ajuste a seção "Estrutura de pastas" do `CLAUDE.md` — é o que mais melhora a precisão das issues.
