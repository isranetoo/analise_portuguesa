# Claude-kit — workflow CTO + devs para Claude Code

Kit genérico para qualquer repositório no GitHub. Uma sessão do Claude Code atua como **CTO**: faz a triagem das demandas, cria issues no padrão do projeto, escolhe o especialista e o modelo pela dificuldade e despacha até **4 devs em paralelo**, cada um no seu git worktree. Os PRs passam pelo `reviewer` e pelos revisores especialistas antes de você aprovar o merge.

## Estrutura
```
Claude-kit/
├── README.md                          → este guia: instalação e uso
├── CLAUDE.md                          → modelo para preencher (regras de ouro, áreas, padrão de issue, regras dos devs, ritmo do GitHub)
├── .worktreeinclude                   → lista dos .env copiados para os worktrees dos agentes
├── scripts/
│   └── setup-cto.sh                   → cria as labels (difficulty, type, agent:* dos agentes ativos, area:* de exemplo) e ajusta o .gitignore
├── .claude/
│   ├── agents/
│   │   ├── dev-junior.md              → genérico, nível fácil (haiku)
│   │   ├── dev-pleno.md               → genérico, nível médio (sonnet)
│   │   ├── dev-senior.md              → genérico, nível difícil (opus)
│   │   ├── reviewer.md                → revisa todo PR (geral + clean code); nunca aprova nem mergeia
│   │   ├── tech-lead.md               → plano técnico e quebra de issues grandes ("Planeje a issue #N")
│   │   ├── arquiteto-software.md      → decisões técnicas e contratos entre áreas
│   │   ├── esp-python.md              → código Python
│   │   ├── esp-qa.md                  → testes unitários e cobertura
│   │   ├── esp-e2e.md                 → testes E2E com Playwright
│   │   ├── esp-cicd.md                → GitHub Actions, só com pedido explícito
│   │   ├── esp-appsec.md              → segurança de aplicações; revisa PRs com entrada externa, servidor ou segredos
│   │   ├── esp-a11y.md                → acessibilidade; revisa PRs do frontend
│   │   ├── esp-css.md                 → CSS e design system
│   │   ├── esp-uiux.md                → interface e UX
│   │   ├── esp-performance-web.md     → performance web; revisa PRs do frontend
│   │   ├── esp-dados.md               → dados gerados, validação e schema compartilhado
│   │   └── esp-scraping.md            → fontes externas: APIs, scraping, PDFs, geocoding
│   ├── commands/
│   │   └── cto.md                     → comando /cto: triagem, issues, despacho, review, aprovação e merge
│   └── skills/
│       ├── abrir-pr/SKILL.md          → abrir o PR de uma issue nova
│       ├── atualizar-pr/SKILL.md      → ajuste de review ou conflito no PR existente
│       ├── criar-issue/SKILL.md       → criar issue com labels e campos do Project
│       └── revisar-pr/SKILL.md        → revisar PR em worktree temporário e comentar
└── agentes/
    ├── README.md                      → índice da biblioteca e como ativar um modelo
    ├── arquitetura/                   → arquiteto de soluções, sistemas distribuídos
    ├── backend/                       → APIs, C#/.NET, Go, Java/Kotlin, PHP/Laravel, Rust, TypeScript/Node
    ├── banco/                         → PostgreSQL, MySQL, NoSQL, Redis, Supabase, modelagem, queries
    ├── dados-ia/                      → ciência de dados, ML, MLOps, LLM, RAG
    ├── frontend/                      → Angular, React/Next, Tailwind, Vue/Nuxt
    ├── infra/                         → cloud, DevOps, SRE, Docker/Kubernetes, Terraform
    ├── mobile/                        → Android, Flutter, iOS, React Native/Expo
    ├── qualidade/                     → Cypress
    └── seguranca/                     → auth, LGPD, pentest
```

## Pré-requisitos
- Claude Code atualizado.
- GitHub CLI (`gh`) instalado e autenticado com os escopos `repo` e `project`: `gh auth login` e, se faltar escopo, `gh auth refresh -s project`.
- Repositório com remote no GitHub.
- Um **GitHub Project** (Projects v2) com os campos de seleção única:
  - **Priority**: `P0`, `P1`, `P2`;
  - **Size**: `XS`, `S`, `M`, `L`, `XL`;
  - **Status**: `Backlog`, `Ready`, `In progress`, `In review`, `Done`.
  Anote o nome e o número do Project (o número está na URL: `https://github.com/users/<owner>/projects/<numero>`).

## Instalação
1. **Copie** a pasta `Claude-kit/` para a raiz do seu repositório e, de dentro dela, copie para a raiz: `.claude/`, `CLAUDE.md`, `.worktreeinclude` e `scripts/setup-cto.sh` (em `scripts/`). A biblioteca fica em `Claude-kit/agentes/` como referência.
   - Se o projeto já tem `CLAUDE.md`, acrescente as seções que faltam em vez de sobrescrever.
2. **Rode** `bash scripts/setup-cto.sh` na raiz (antes, ajuste a lista `AREAS` do script às áreas do projeto). Ele cria as labels com pausa entre as chamadas e põe `.claude/worktrees/` no `.gitignore`.
3. **Preencha o `CLAUDE.md`**: troque os marcadores `<...>` (nome do projeto, `<owner>`, nome/número do Project, `<comando de testes>`, caminho do checkout principal, stack, comandos) e monte a tabela de áreas da seção 4 — é ela que define o que pode rodar em paralelo.
4. **Ajuste os agentes e o `/cto`** ao projeto: troque os marcadores de arquivos (`<arquivos do frontend>`, `<pasta de testes>`...) nos agentes ativos, na tabela 2.2 e na tabela de revisores (seção 6) de `.claude/commands/cto.md`, e nas skills (`<comando de testes>`, `<nome do Project>`, `<numero do Project>`, `<owner>`). Apague os especialistas que o projeto não usa (arquivo, linha no `CLAUDE.md` e no `cto.md`, label `agent:`). Confira com:
   ```bash
   grep -rn "<[a-zA-Z][^>]*>" CLAUDE.md .claude/ | grep -vE "<(N|PR|tipo|slug|branch|branch-do-PR|pasta-temp|url|nivel|resumo|motivo|total|numero)>"
   ```
5. **Ative modelos da biblioteca** quando a stack pedir: copie de `Claude-kit/agentes/<categoria>/<nome>.md` para `.claude/agents/<nome>.md` e siga o passo a passo de `Claude-kit/agentes/README.md` (marcadores, label `agent:<nome>`, roteamento no `cto.md` e no `CLAUDE.md`).
6. **Comite** tudo na `main`, para que os worktrees dos agentes já enxerguem os arquivos.

## Uso
```bash
claude --model opus
```
```
/cto 1) botão de login quebrado no Safari 2) exportar CSV no dashboard 3) testes da API de pedidos
```
Ciclo de uma demanda: demanda → triagem (CTO escolhe especialista + nível) → issue com labels e campos do Project (`criar-issue`) → especialista ou dev no worktree → PR com `Closes #N` (`abrir-pr`) → `reviewer` + revisores especialistas ("Revise o PR #N", `revisar-pr`) → ajustes na mesma branch (`atualizar-pr`) → você aprova pela caixa de seleção (`AskUserQuestion`) → o CTO mergeia na ordem recomendada.

- **Nível e modelo:** a label `difficulty:` define o modelo no despacho (easy → haiku, medium → sonnet, hard → opus); o `model:` do arquivo do agente é só o padrão. Agente que percebe que a tarefa é maior que o nível ou fora do domínio responde `ESCALAR` e o CTO redespacha.
- **Paralelismo:** até 4 devs; duas issues só rodam juntas se não tiverem arquivo em comum (tabela de áreas).
- **Mudança em várias áreas:** o `arquiteto-software` define a abordagem e o `tech-lead` quebra em issues sem arquivos em comum.
- **Aprovação:** o CTO analisa conflitos, propõe a ordem de merge e só mergeia o que você marcar.

## Dicas
- **Permissões:** para os agentes em background não travarem pedindo aprovação, libere `git` e `gh` via `/permissions` (ou no `.claude/settings.json` do projeto). Se uma ação for negada, o agente para com `FALHOU: permissão` em vez de contornar.
- **Rate limit do GitHub:** siga a seção "Ritmo das chamadas ao GitHub" do `CLAUDE.md` (5 s entre escritas, 10 s entre consultas, 20–30 s no polling de CI, no máximo 4 agentes usando `gh`). Em limite secundário, espere em background testando a cada 60 s.
- **CI só na `main`:** os testes locais (dev e reviewer) são o portão dos PRs; o CI roda em push na `main` e o CTO confere depois de cada lote de merges (vermelho = issue P0).
- **Custo:** a triagem em Opus vale a pena; para economizar, rebaixe o `reviewer` para `haiku`.
- **Precisão das issues:** quanto mais exata a tabela de áreas e arquivos do `CLAUDE.md`, melhores as issues e menos conflitos.
