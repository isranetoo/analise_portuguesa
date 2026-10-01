# Biblioteca de modelos de agentes

Modelos de especialistas para stacks que **não** são usadas neste repo hoje. Eles ficam aqui, fora de `.claude/agents/`, para o Claude Code não os carregar nem o CTO despachá-los. Os agentes ativos do projeto estão em `.claude/agents/` (lista na seção "Agentes" do `CLAUDE.md`; roteamento em `.claude/commands/cto.md`, seção 2).

Seguem o formato dos ativos: níveis por `difficulty:` (easy → haiku, medium → sonnet, hard → opus), modo implementação, modo revisão e checklist do domínio. Ao ativar, confira que o arquivo cita as regras de "Ritmo das chamadas ao GitHub" do `CLAUDE.md` e as skills de `.claude/skills/`.

## Índice

### Arquitetura (`arquitetura/`)
| Arquivo | Quando usar |
|---|---|
| `arquiteto-solucoes.md` | decisões que cruzam áreas: componentes, fronteiras, integrações, requisitos não funcionais, custo e migração |
| `esp-sistemas-distribuidos.md` | microsserviços, mensageria, consistência, resiliência, observabilidade |

### Backend (`backend/`)
| Arquivo | Quando usar |
|---|---|
| `arquiteto-apis.md` | contratos de API (REST/OpenAPI, GraphQL, gRPC): versionamento, erros, paginação, compatibilidade |
| `esp-csharp-dotnet.md` | C#/.NET (ASP.NET Core, minimal APIs, EF Core, workers) |
| `esp-go.md` | Go (serviços HTTP/gRPC, CLIs, workers) |
| `esp-java-kotlin-spring.md` | Java/Kotlin com Spring Boot (controllers, services, JPA, Gradle/Maven) |
| `esp-php-laravel.md` | PHP/Laravel (rotas, controllers, Eloquent, filas, migrations) |
| `esp-rust.md` | Rust (axum, actix, tokio, CLIs, crates) |
| `esp-typescript-node.md` | TypeScript/Node.js (Express, Fastify, NestJS, scripts e servidores Node) |

### Banco de dados (`banco/`)
| Arquivo | Quando usar |
|---|---|
| `dba-postgresql.md` | PostgreSQL: esquema, migrations, índices, constraints, extensões, tuning |
| `esp-modelagem-dados.md` | entidades, relacionamentos, normalização, dicionário de dados, formatos CSV/JSON/SQL |
| `esp-mysql.md` | MySQL/MariaDB: esquema, migrations, índices, charset/collation |
| `esp-nosql.md` | MongoDB/DynamoDB: modelagem de documentos, índices, chaves de partição |
| `esp-otimizacao-queries.md` | planos de execução, índices, N+1, paginação, custo |
| `esp-redis.md` | cache, filas, rate limit, TTL, persistência |
| `esp-supabase.md` | RLS, Edge Functions, Auth, Storage, migrations |

### Dados e IA (`dados-ia/`)
| Arquivo | Quando usar |
|---|---|
| `cientista-dados.md` | análise exploratória, estatística, indicadores, visualização |
| `eng-machine-learning.md` | treino, validação, métricas, features, inferência |
| `eng-mlops.md` | pipelines de treino/deploy, versionamento de modelos e dados, monitoramento |
| `esp-llm-prompt.md` | prompts, saída estruturada, avaliação, APIs de LLM |
| `esp-rag-vetorial.md` | chunking, embeddings, busca vetorial/híbrida, avaliação de recuperação |

### Frontend (`frontend/`)
| Arquivo | Quando usar |
|---|---|
| `esp-angular.md` | Angular (componentes, serviços, rotas, RxJS/signals) |
| `esp-react-next.md` | React/Next.js (App Router, hooks, data fetching) |
| `esp-tailwind.md` | Tailwind (tokens, variantes, tema) |
| `esp-vue-nuxt.md` | Vue 3/Nuxt (composables, Pinia, páginas) |

### Infraestrutura (`infra/`)
| Arquivo | Quando usar |
|---|---|
| `eng-cloud.md` | recursos AWS/GCP/Azure como código, custo e segurança |
| `eng-devops.md` | CI/CD, build/deploy, scripts e ambientes |
| `eng-sre.md` | SLOs, observabilidade, alertas, runbooks, incidentes |
| `esp-docker-kubernetes.md` | Dockerfile, compose, manifests, Helm, probes |
| `esp-terraform.md` | módulos, state, variáveis, providers |

### Mobile (`mobile/`)
| Arquivo | Quando usar |
|---|---|
| `esp-android-kotlin.md` | Android (Jetpack Compose/Views, coroutines, Room, Gradle) |
| `esp-flutter.md` | Flutter/Dart (widgets, estado, plugins) |
| `esp-ios-swift.md` | iOS (SwiftUI/UIKit, concorrência Swift, Xcode) |
| `esp-react-native-expo.md` | React Native/Expo (telas, navegação, EAS) |

### Qualidade (`qualidade/`)
| Arquivo | Quando usar |
|---|---|
| `esp-cypress.md` | testes E2E com Cypress (fixtures, `cy.intercept`, specs estáveis) |

### Segurança (`seguranca/`)
| Arquivo | Quando usar |
|---|---|
| `esp-auth.md` | OAuth 2.0/OIDC, JWT, sessões, cookies, controle de acesso |
| `esp-lgpd.md` | dados pessoais, base legal, minimização, retenção, direitos dos titulares |
| `esp-pentest.md` | análise estática de vulnerabilidades, SOMENTE em escopo autorizado |

## Como ativar um modelo
Ativar um modelo é mudança do kit: abra uma issue `area:kit` (skill `criar-issue`) e siga o fluxo normal.

1. **Copie** o arquivo para `.claude/agents/` mantendo o nome (ex.: `kit/agentes/backend/esp-go.md` → `.claude/agents/esp-go.md`). O `name:` do frontmatter deve ser igual ao nome do arquivo sem `.md`.
2. **Ajuste os marcadores** de todo o arquivo (frontmatter e corpo). Os modelos usam estes formatos:
   - `<arquivos da área>`, `<arquivos-da-area>` ou `<ARQUIVOS_DA_AREA>` → os arquivos reais da área (tabela da seção 4 do `CLAUDE.md`);
   - `<PROJETO>` e `<STACK>` → nome do projeto e stack;
   - `<comando de testes do CLAUDE.md>` → o comando da seção 3 do `CLAUDE.md` (aqui, `python -m unittest -v`).
   Confira com `grep -n "<[A-Za-z_-]*>" .claude/agents/<nome>.md` que não sobrou marcador do modelo (os `<N>`, `<PR>`, `<tipo>` dos comandos são parte do fluxo e ficam).
   Remova notas como "hoje este repo usa JS puro, então só como modelo" e ajuste o checklist do domínio ao código real.
3. **Crie a label** `agent:<nome>` (mesma cor das outras `agent:*`, `BFDADC`):
   ```bash
   gh label create "agent:<nome>" --color BFDADC --description "<quando usar>"
   ```
   (pausa de 5 s entre chamadas `gh` que escrevem; ver "Ritmo das chamadas ao GitHub" no `CLAUDE.md`).
4. **Registre o roteamento:** uma linha na tabela 2.2 de `.claude/commands/cto.md` (e na tabela de revisores da seção 6, se ele revisar PRs) e uma linha na seção "Agentes" do `CLAUDE.md`.
5. Mantenha o original em `kit/agentes/` como referência; não é preciso apagá-lo.
