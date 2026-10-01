# CLAUDE.md — Portuguesa: Painel de Desempenho

Painel estático da Associação Portuguesa de Desportos na Série D 2026: a coleta lê a API pública da CBF e gera os dados; o painel (JS puro) mostra indicadores, fases, mata-mata, público, viagens e comparação com 2025. Publicado no Streamlit Community Cloud a cada push na `main`.

Este arquivo vale para TODOS os agentes (CTO, devs e reviewer). O fluxo detalhado do CTO está em `.claude/commands/cto.md`.

## 1. Regras de ouro
1. **Todo pedido vira issue.** Qualquer bug, pedido, ajuste ou informação que o usuário passar no chat vira uma issue na hora, no padrão da seção 5, antes de qualquer implementação. Responda com o link. Só perguntas que não pedem mudança ficam fora.
2. **Uma issue = uma branch = um PR.** Ajustes de review vão na MESMA branch e no MESMO PR. Nunca abra um segundo PR para a mesma issue.
3. **Sem conflitos por construção.** Duas issues só rodam ao mesmo tempo se não tiverem nenhum arquivo em comum (seção 4). Toda branch parte de `origin/main` atualizada e é sincronizada com ela antes do PR.
4. **Testes locais são o portão.** Todo dev e o reviewer rodam `python -m unittest -v` e informam o resultado. O CI vai rodar só na `main` (issue #37); até essa mudança entrar, ele também roda nos PRs.
5. **Merge só com aprovação explícita** do usuário (`isranetoo`) para aquele PR.
6. **Nunca troque a branch do checkout principal** (`C:/Users/IsraelAntunes/Desktop/fastapi/analise_portuguesa`). Use o seu worktree ou um worktree temporário.

## 2. Stack
- Frontend: JavaScript puro (ES6), HTML, CSS — sem framework e sem build. Leaflet 1.9.4 via cdnjs.
- Coleta: Python 3.12 + `pdfplumber` (boletins em PDF). API da CBF pública, sem chave.
- Publicação: Streamlit (`streamlit_app.py` embute o HTML). Servidor local opcional: `node server.js`.
- Pacotes: pip (`requirements.txt`, `requirements-coleta.txt`, `requirements-dev.txt`). Sem banco de dados.

## 3. Comandos
```bash
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python -m unittest -v          # OBRIGATÓRIO antes de abrir/atualizar PR
```
Não há lint, typecheck nem build. Rodar local: `node server.js` (http://localhost:8000) ou `python iniciar.py` (Streamlit, http://localhost:8501). Coleta manual: `python coleta_detalhada.py`.

CI (`.github/workflows/testes.yml`): depois da issue #37, roda só em push na `main` e manualmente (hoje ainda roda também em PRs). Depois de cada lote de merges, o CTO confere `gh run list --branch main --limit 1`; CI vermelho na `main` vira issue P0.

## 4. Áreas e arquivos
Cada issue tem uma label `area:*`. Os arquivos de uma área são compartilhados: issues da mesma área rodam em sequência (a próxima só começa depois do merge do PR anterior).

| Área | Arquivos |
|---|---|
| `area:painel` | `index.html`, `app.js`, `styles.css`, `tests/test_painel.py` |
| `area:coleta` | `coleta_detalhada.py`, `config.json`, `tests/test_coleta.py`, dados gerados |
| `area:publicacao` | `streamlit_app.py`, `iniciar.py`, `windows_asyncio.py`, `server.js`, `requirements*.txt` |
| `area:docs` | `README.md` |
| `area:ci` | `.github/workflows/` |
| `area:kit` | `CLAUDE.md`, `.claude/`, `scripts/`, `README-CTO.md`, `.worktreeinclude` |

Dados gerados (`dados.js`, `*.csv`, `boletins.json`, `coordenadas.json`): só mudam rodando `coleta_detalhada.py`, nunca à mão.

## 5. Padrão de issue
- Título: `<tipo>: <descrição>` (tipos: fix, feat, chore, docs, ci, test).
- Labels: `difficulty:<easy|medium|hard>`, `type:<bug|feature|chore>`, `agent:<dev-junior|dev-pleno|dev-senior>`, `area:<...>`.
- Projeto **Portuguesa** (https://github.com/users/isranetoo/projects/2), assignee `isranetoo`, campos **Priority**, **Size** e **Status**.
- Corpo: Contexto · Comportamento atual · Comportamento esperado · Critérios de aceite (checklist) · Arquivos prováveis · Fora de escopo.

| Priority | Quando |
|---|---|
| P0 | painel ou coleta quebrados em produção, dados errados publicados, CI vermelho na `main` |
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
3. **Testes:** cubra os critérios de aceite; rode `python -m unittest -v` e escreva o total (ex.: "54 testes OK") no PR.
4. **Antes de abrir ou atualizar o PR:** `git fetch origin && git merge origin/main`, resolva conflitos mantendo os dois lados (inclusive os testes de ambos) e rode os testes de novo. Nunca force push.
5. **Commits:** Conventional Commits em português, minúsculo, sem acento, terminando em `(#<N>)`.
6. **PR:** `gh pr create --assignee @me --label "difficulty:<...>" --body-file -`, com `Closes #<N>` na PRIMEIRA linha, depois "O que mudou", "Como testar" e "Testes: <total> OK".
7. **Ajustes de review ou conflito:** trabalhe na branch do PR existente (`git fetch origin && git checkout -b tmp-<N> origin/<branch-do-PR>`, depois `git push origin HEAD:<branch-do-PR>`) e atualize o corpo do PR se ele ficar desatualizado.
8. **Nunca:** merge, force push, editar `.env`/secrets/workflows sem a issue pedir, editar dados gerados à mão, trocar a branch do checkout principal.

## 7. Convenções de código
- Idioma: siga o do arquivo editado. UI em pt-BR. Python (coleta, testes): nomes, docstrings e comentários em português. JS (`app.js`, `server.js`): nomes e comentários em inglês. Chaves de dados/JSON em português.
- Mudança mínima: não refatore fora do pedido; siga o padrão existente no arquivo.
- Testes em `unittest` (não pytest); Playwright em `tests/test_painel.py`; nenhum teste acessa a rede.

## 8. Não mexer sem pedido explícito na issue
- `.env` e secrets (`FSAPI_KEY` não é usado pelo código).
- `.github/workflows/` (`testes.yml` = CI; `coleta.yml` = coleta semanal abr–nov, seg 09:00 UTC, commita os dados direto na `main`).
- `config.json` (muda clube/competição de todo o pipeline).
- Kit de agentes (`area:kit`).

## 9. Ritmo das chamadas ao GitHub
A API do GitHub tem dois limites: primário (5000 requisições/hora por usuário) e secundário (para evitar abuso em padrões específicos). Para evitar bloqueios:

**Chamadas que escrevem** (`gh issue create/edit`, `gh pr create/edit/merge`, `gh project item-edit`, `gh label`):
- Nunca em laço sem pausa: adicione um `sleep 5` entre chamadas em sequência.
- Exceção: `gh pr edit` para adicionar labels/assignees a um único PR não precisa de pausa.

**Polling e consultas** (CI, `gh pr view --json mergeable`, verificação de status):
- Mínimo 10 s entre consultas (20–30 s para CI que pode ser lento).

**Tratamento de rate limit:**
- Se `gh` retornar "API rate limit exceeded":
  1. Rode `gh api rate_limit --jq '.resources'` para diagnosticar.
  2. Se ainda há cota, é limite secundário: espere em background (parar outras chamadas) testando a cada 60 s com uma consulta leve (`gh api graphql -f query='query{viewer{login}}'`) até ela voltar.
  3. Se a cota acabou, espere até `reset` (timestamp em segundos).
  4. Retome uma chamada por vez; não dispare laços.

**Limites gerais:**
- No máximo 4 agentes/devs usando `gh` ao mesmo tempo (limite de dev).
- Evitar disparar vários reviewers de uma vez em lotes grandes de PRs.

## 10. Variáveis de ambiente
Nenhuma é necessária para os testes. `PORT` (opcional) em `server.js`, padrão 8000.
