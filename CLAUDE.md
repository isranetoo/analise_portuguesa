# CLAUDE.md — Portuguesa: Painel de Desempenho

Dashboard gerencial que transforma dados da Associação Portuguesa de Desportos na Série D 2026 (coleta da API pública da CBF) em indicadores, análises por fase, mata-mata, público, viagens e comparação com 2025.

## Visão geral
Painel estático que consome dados da Série D 2026 via coleta automática (segunda-feira 09:00 UTC, abr–nov), oferece leitura interativa com mapas (Leaflet), e é publicado no Streamlit Community Cloud. Dados no repositório: `dados.js` (frontend), `*.csv` e `boletins.json` (análises).

## Stack
- Frontend: JavaScript puro (ES6), HTML5, CSS3 (sem framework, sem build)
- Coleta: Python 3.12 + pdfplumber (para boletins em PDF)
- Publicação: Streamlit Community Cloud (redeploya a cada push na `main`)
- Servidor local opcional: Node.js (sem dependências externas)
- API de dados: CBF (pública, sem autenticação)
- Gerenciador de pacotes: pip (sem lockfile)

## Comandos de verificação (OBRIGATÓRIO rodar antes de abrir PR)
```bash
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python -m unittest -v
```

**Notas**: Não há lint, typecheck, nem build configurados. Para executar localmente:
- **Frontend**: `node server.js` (http://localhost:8000) — servidor sem dependências
- **Streamlit**: `python -m pip install -r requirements.txt && python iniciar.py` (http://localhost:8501)
- **Coleta manual**: `python -m pip install -r requirements-coleta.txt && python coleta_detalhada.py`

## Estrutura de pastas
```
index.html              Front-end estático (UI principal)
app.js                  Lógica de interação e visualização (JS puro)
styles.css              Estilos do painel
dados.js                Dados dos jogos/atletas/gols (gerado pela coleta)
coleta_detalhada.py     Script Python que baixa dados da CBF e gera os arquivos
streamlit_app.py        Página de publicação no Streamlit
server.js               Servidor local Node.js (opcional)
iniciar.py              Script para rodar Streamlit no Windows
config.json             Configuração de clube/competição (refletida em todo o pipeline)
requirements*.txt       Dependências pip (dev, coleta, runtime)
tests/                  Testes unitários (unittest) e Playwright
.github/workflows/      CI/CD e coleta automática (NÃO EDITAR)
```

## Convenções
- Branches: `fix/<issue>-slug`, `feat/<issue>-slug`, `chore/<issue>-slug`
- Commits: Conventional Commits em português, minúsculo, sem acento (ex.: `fix: publico dos boletins`), sempre com `(#<issue>)` no final
- PR: sempre com `Closes #<issue>` na primeira linha do corpo (é o que vincula o PR à issue)
- Idioma: seguir o do arquivo sendo editado
  - UI: português (pt-BR)
  - Python (coleta, testes): português nas docstrings/comentários, nomes de variáveis em português (`baixar`, `montar_linha`)
  - JavaScript (`app.js`, `server.js`): nomes e comentários em inglês
  - JSON (chaves de dados): português (`jogos`, `gols`, `atletas`)

## Issues, PRs e projeto no GitHub
- Toda issue entra no projeto **Portuguesa** (https://github.com/users/isranetoo/projects/2).
- Assignee de toda issue e de todo PR: `isranetoo` (`--assignee @me`).
- Toda issue recebe o campo **Size** do projeto:

| Size | Quando usar |
|---|---|
| XS | texto, typo, ajuste trivial em 1 arquivo |
| S | 1 arquivo com pouca lógica, sem ou com poucos testes |
| M | um módulo com lógica nova e testes |
| L | vários arquivos, investigação ou causa incerta |
| XL | vários módulos ou mudança de arquitetura |

- Labels obrigatórias: `difficulty:<easy|medium|hard>`, `type:<bug|feature|chore>`, `agent:<dev-junior|dev-pleno|dev-senior>`.
- PRs não são adicionados ao projeto; aparecem na issue pela coluna "Linked pull requests".
- Quando um PR passa no review (veredito PRONTO), ele é enviado no chat para `isranetoo` aprovar. O merge só acontece com a aprovação explícita dele para aquele PR.

## Banco de dados
Projeto não possui banco de dados. Dados provêm da API pública da CBF e são armazenados em arquivos gerados (`dados.js`, `*.csv`, `boletins.json`, `coordenadas.json`).

## Não mexer sem pedido explícito
- `.env`, secrets (contém `FSAPI_KEY`, não usado pelo código)
- `.github/workflows/` (`testes.yml` = CI; `coleta.yml` = coleta semanal abr–nov seg 09:00 UTC, commita dados direto)
- Dados gerados — regenerar sempre com `coleta_detalhada.py`, nunca editar à mão: `dados.js`, `*.csv`, `boletins.json`, `coordenadas.json`
- `config.json` (muda clube/competição de todo o pipeline)
- Kit CTO: `.claude/`, `scripts/setup-cto.sh`, `.worktreeinclude`, `README-CTO.md`

## Variáveis de ambiente necessárias para rodar testes
Nenhuma. A API da CBF não exige chave; os workflows não usam `secrets.*`. `PORT` (opcional) em `server.js` default é 8000.
