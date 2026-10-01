# CLAUDE.md — <NOME DO PROJETO>

> Preencha as seções marcadas com <...>. Os agentes leem este arquivo antes de cada tarefa.

## Visão geral
<1–3 linhas: o que é o produto e para quem>

## Stack
- <ex.: Next.js 15 (App Router), React, TypeScript, Tailwind, Supabase (Postgres + Auth + Storage)>
- Gerenciador de pacotes: <pnpm | npm | yarn | bun | uv | poetry>

## Comandos de verificação (OBRIGATÓRIO rodar antes de abrir PR)
```bash
<pnpm install>
<pnpm lint>
<pnpm typecheck>
<pnpm test>
<pnpm build>
```

## Estrutura de pastas
```
<src/app        rotas>
<src/components componentes de UI>
<src/lib        utilitários e clientes>
<supabase/migrations  migrations SQL>
```

## Convenções
- Branches: `fix/<issue>-slug`, `feat/<issue>-slug`, `chore/<issue>-slug`
- Commits: Conventional Commits, sempre com `(#<issue>)` no final
- PR: sempre com `Closes #<issue>` no corpo
- Idioma: código e nomes em inglês; textos de UI em pt-BR
- <padrões de nomenclatura, estilo de componentes, tratamento de erros, etc.>

## Banco de dados
- Migrations ficam em `<supabase/migrations>` e são criadas com `<supabase migration new nome>`
- NUNCA aplicar migrations em nenhum ambiente — só criar o arquivo no PR
- Toda tabela nova: RLS habilitado + policies explícitas

## Não mexer sem pedido explícito
- `.env*`, secrets, `.github/workflows/`, lockfiles, migrations já existentes
- <outros arquivos sensíveis>

## Variáveis de ambiente necessárias para rodar testes
- <ex.: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY — copiados via .worktreeinclude>
