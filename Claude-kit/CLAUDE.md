# CLAUDE.md — <NOME DO PROJETO>

> Modelo do Claude-kit. Troque todos os marcadores `<...>` (exceto os do fluxo, como `<N>`, `<PR>`, `<tipo>`, `<slug>`) e apague as linhas que não se aplicam. Os agentes leem este arquivo da `main` antes de cada tarefa.

<1–3 linhas: o que é o produto, para quem e onde é publicado>

Este arquivo vale para TODOS os agentes (CTO, devs e reviewer). O fluxo detalhado do CTO está em `.claude/commands/cto.md`.

## 1. Regras de ouro
1. **Todo pedido vira issue.** Qualquer bug, pedido, ajuste ou informação que o usuário passar no chat vira uma issue na hora, no padrão da seção 5, antes de qualquer implementação. Responda com o link. Só perguntas que não pedem mudança ficam fora.
2. **Uma issue = uma branch = um PR.** Ajustes de review vão na MESMA branch e no MESMO PR. Nunca abra um segundo PR para a mesma issue.
3. **Sem conflitos por construção.** Duas issues só rodam ao mesmo tempo se não tiverem nenhum arquivo em comum (seção 4). Toda branch parte de `origin/main` atualizada e é sincronizada com ela antes do PR.
4. **Testes locais são o portão.** Todo dev e o reviewer rodam `<comando de testes>` e informam o resultado. O CI roda só na `main` (e manualmente); os PRs dependem dos testes locais.
5. **Merge só com aprovação explícita** do usuário (`<owner>`) para aquele PR.
6. **Nunca troque a branch do checkout principal** (`<caminho do checkout principal>`). Use o seu worktree ou um worktree temporário.

## 2. Stack
- <ex.: frontend em React + TypeScript; backend em Python 3.12 + FastAPI; Postgres>
- Pacotes: <pip | uv | poetry | npm | pnpm | yarn | bun> (`<arquivos de dependência>`).
- <banco de dados, serviços externos e onde o produto é publicado>

## 3. Comandos
```bash
<comando de instalação das dependências>
<comando de instalação de ferramentas de teste, se houver (ex.: navegador do Playwright)>
<comando de testes>          # OBRIGATÓRIO antes de abrir/atualizar PR
<lint / typecheck / build, se houver>
```
Rodar local: `<comando para rodar o projeto>`. Gerar dados (se houver): `<comando que gera os dados>`.

CI (`.github/workflows/<arquivo de CI>`): roda em push na `main` e manualmente. Depois de cada lote de merges, o CTO confere `gh run list --branch main --limit 1`; CI vermelho na `main` vira issue P0.

## 4. Áreas e arquivos
Cada issue tem uma label `area:*`. Os arquivos de uma área são compartilhados: issues da mesma área rodam em sequência (a próxima só começa depois do merge do PR anterior).

Tabela de exemplo — troque pelas áreas reais do projeto (e ajuste as labels `area:*` criadas pelo `scripts/setup-cto.sh`):

| Área | Arquivos |
|---|---|
| `area:frontend` | `<arquivos do frontend>`, `<testes do frontend>` |
| `area:backend` | `<arquivos do backend>`, `<testes do backend>` |
| `area:dados` | `<código que gera dados>`, `<configuração do pipeline>`, `<testes>`, dados gerados |
| `area:docs` | `README.md` |
| `area:ci` | `.github/workflows/` |
| `area:kit` | `CLAUDE.md`, `.claude/`, `scripts/`, `.worktreeinclude`, `Claude-kit/` |

Dados gerados (`<arquivos gerados>`): só mudam rodando `<comando que gera os dados>`, nunca à mão.

## 5. Padrão de issue
- Título: `<tipo>: <descrição>` (tipos: fix, feat, chore, docs, ci, test).
- Labels: `difficulty:<easy|medium|hard>`, `type:<bug|feature|chore>`, `agent:<especialista ou dev-junior|dev-pleno|dev-senior>`, `area:<...>`.
- Projeto **<nome do Project>** (https://github.com/users/<owner>/projects/<numero do Project>), assignee `<owner>`, campos **Priority**, **Size** e **Status**.
- Corpo: Contexto · Comportamento atual · Comportamento esperado · Critérios de aceite (checklist) · Arquivos prováveis · Fora de escopo.

| Priority | Quando |
|---|---|
| P0 | produção quebrada, dados errados publicados, CI vermelho na `main` |
| P1 | bug visível ao usuário ou pedido explícito do usuário |
| P2 | melhoria, refatoração, testes, documentação |

| Size | Quando |
|---|---|
| XS | texto, typo, ajuste trivial em 1 arquivo |
| S | 1 arquivo com pouca lógica |
| M | um módulo com lógica nova e testes |
| L | vários arquivos, investigação ou causa incerta |
| XL | vários módulos ou mudança de arquitetura |

Status: `Backlog` (criada ou bloqueada) → `Ready` (triada, sem bloqueio) → `In progress` (dev trabalhando) → `In review` (PR aberto) → `Done` (merge).

## 6. Regras para todos os devs
1. **Comece de `origin/main`:** `git fetch origin && git checkout -b <tipo>/<N>-<slug> origin/main`. Não trabalhe na branch `worktree-agent-*` criada automaticamente.
2. **Escopo:** altere só os "Arquivos prováveis" da issue. Precisou de outro arquivo? Se for da mesma área e pequeno, explique no PR; se for de outra área, pare e reporte `ESCALAR` com o motivo.
3. **Testes:** cubra os critérios de aceite; rode `<comando de testes>` e escreva o total (ex.: "54 testes OK") no PR.
4. **Antes de abrir ou atualizar o PR:** `git fetch origin && git merge origin/main`, resolva conflitos mantendo os dois lados (inclusive os testes de ambos) e rode os testes de novo. Nunca force push.
5. **Commits:** Conventional Commits em português, minúsculo, sem acento, terminando em `(#<N>)`.
6. **PR:** `gh pr create --assignee @me --label "difficulty:<...>" --body-file -`, com `Closes #<N>` na PRIMEIRA linha, depois "O que mudou", "Como testar" e "Testes: <total> OK". (Adicione um `sleep 5` entre a criação/atualização do PR e outras chamadas `gh`; ver "Ritmo das chamadas ao GitHub" na seção 9.)
7. **Ajustes de review ou conflito:** trabalhe na branch do PR existente (`git fetch origin && git checkout -b tmp-<N> origin/<branch-do-PR>`, depois `git push origin HEAD:<branch-do-PR>`) e atualize o corpo do PR se ele ficar desatualizado.
8. **Nunca:** merge, force push, editar `.env`/secrets/workflows sem a issue pedir, editar dados gerados à mão, trocar a branch do checkout principal.

## 7. Convenções de código
- Idioma: siga o do arquivo editado. UI em <pt-BR>. <ex.: Python com nomes e comentários em português; JS/TS em inglês; chaves de dados em português>.
- Mudança mínima: não refatore fora do pedido; siga o padrão existente no arquivo.
- Testes em `<framework de testes>`; nenhum teste acessa a rede.
- <padrões de nomenclatura, estilo de componentes, tratamento de erros etc.>

## 8. Não mexer sem pedido explícito na issue
- `.env` e secrets.
- `.github/workflows/` (`<arquivos de workflow e o que cada um faz>`).
- `<arquivos de configuração sensíveis>`.
- Lockfiles e migrations já existentes, se houver.
- Kit de agentes (`area:kit`).

## 9. Ritmo das chamadas ao GitHub
A API do GitHub tem dois limites: primário (5000 requisições/hora por usuário) e secundário (para evitar abuso em padrões específicos). Para evitar bloqueios:

**Chamadas que escrevem** (`gh issue create/edit`, `gh pr create/edit/merge`, `gh project item-edit`, `gh label`):
- Nunca em laço sem pausa: adicione um `sleep 5` entre chamadas em sequência.

**Polling e consultas** (CI, `gh pr view --json mergeable`, verificação de status):
- Mínimo 10 s entre consultas (20–30 s para CI que pode ser lento).

**Tratamento de rate limit:**
- Se `gh` retornar "API rate limit exceeded":
  1. Rode `gh api rate_limit --jq '.resources'` para diagnosticar.
  2. Se ainda há cota, é limite secundário: espere em background, sem fazer outras chamadas `gh`, testando a cada 60 s com uma consulta leve (`gh api graphql -f query='query{viewer{login}}'`) até ela voltar.
  3. Se a cota acabou, espere até `reset` (timestamp em segundos).
  4. Retome uma chamada por vez; não dispare laços.

**Limites gerais:**
- No máximo 4 agentes/devs usando `gh` ao mesmo tempo (limite de dev).
- Evitar disparar vários reviewers de uma vez em lotes grandes de PRs.

## 10. Variáveis de ambiente
<variáveis necessárias para rodar os testes, ou "Nenhuma é necessária para os testes". Arquivos `.env*` são copiados para os worktrees via `.worktreeinclude`.>

## 11. Agentes
Agentes ativos em `.claude/agents/`. O CTO escolhe o agente pela área/tecnologia (label `agent:`) e o nível pela `difficulty:` (easy → haiku, medium → sonnet, hard → opus); roteamento completo em `.claude/commands/cto.md`, seção 2. Apague as linhas dos especialistas que o projeto não usa (e os arquivos correspondentes).

| Agente | Quando usar |
|---|---|
| `esp-python` | código Python (`<arquivos Python>`) |
| `esp-scraping` | fontes externas: APIs de terceiros, scraping, PDFs, geocoding |
| `esp-dados` | o que é gerado ou validado (CSV/JSON, schema compartilhado, caches) |
| `esp-uiux` | interface (páginas, filtros, KPIs, gráficos, textos) |
| `esp-css` | estilo (tokens, tema, responsivo) |
| `esp-a11y` | acessibilidade; revisa PRs do frontend |
| `esp-performance-web` | performance web; revisa PRs do frontend |
| `esp-qa` | testes unitários e cobertura |
| `esp-e2e` | testes E2E com Playwright |
| `esp-cicd` | `.github/workflows/`, só com pedido explícito |
| `esp-appsec` | segurança em qualquer área; revisa PRs com entrada externa, servidor ou segredos |
| `arquiteto-software` | decisões técnicas e contratos entre áreas |
| `tech-lead` | plano e quebra de issues grandes ("Planeje a issue #N") |
| `dev-junior` / `dev-pleno` / `dev-senior` | genéricos (fallback) quando nenhum especialista encaixa |
| `reviewer` | revisa todo PR (geral + clean code) |

Skills do fluxo em `.claude/skills/`: `criar-issue`, `abrir-pr`, `atualizar-pr`, `revisar-pr`. Modelos para outras stacks (não ativos): `Claude-kit/agentes/README.md`.
