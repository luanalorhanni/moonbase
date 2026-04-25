# moonbase

Sistema pessoal de controle financeiro construído com Next.js, Tailwind, shadcn/ui e Supabase.

A fonte da verdade do projeto — stack, ADRs, schema, convenções, identidade visual e plano de migração em fases — vive em [`docs/architecture.md`](docs/architecture.md). Toda decisão arquitetural é tomada referenciando esse documento.

## Getting started

Pré-requisitos:

- Node.js 22+
- pnpm 10+

```bash
pnpm install
cp .env.local.example .env.local   # depois preencher os valores reais
pnpm dev                           # http://localhost:3000
```

## Scripts

| Comando            | O que faz                                  |
| ------------------ | ------------------------------------------ |
| `pnpm dev`         | Servidor de desenvolvimento (Turbopack)    |
| `pnpm build`       | Build de produção                          |
| `pnpm start`       | Servir build de produção localmente        |
| `pnpm lint`        | ESLint                                     |
| `pnpm typecheck`   | `tsc --noEmit`                             |
| `pnpm test`        | Vitest (unitários, modo run-once)          |
| `pnpm format`      | Formatar com Prettier                      |

## Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha. Detalhes do que cada variável faz estão no próprio `.env.local.example`. **Nunca commite `.env.local`.**

## Convenções

- Inglês para código, identificadores e mensagens de commit; português brasileiro para UI.
- Toda mudança via PR; nunca commitar direto em `main`.
- Lógica pura em `lib/finance/*` é coberta por testes Vitest e nunca toca o banco.

Mais detalhes na seção 6 do arch doc.
