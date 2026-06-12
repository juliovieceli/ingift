# InGift — Impressão 3D

Landing page + painel admin para orçamentos, calculadora de preço e controle de estoque.

## Stack

- Vite + React + TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL, Auth, Storage)
- React Router, TanStack Query

## Configuração

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No **SQL Editor**, rode os scripts em ordem:
   - `supabase/migrations/001_extensoes.sql`
   - `supabase/migrations/002_schema.sql`
   - `supabase/migrations/003_funcoes_triggers.sql`
   - `supabase/migrations/004_rls_policies.sql`
   - `supabase/migrations/005_storage.sql`
   - `supabase/migrations/006_seed.sql`
   - `supabase/migrations/007_security_hardening.sql`
3. **Authentication → Providers → Email:** habilitar e-mail; **desabilitar signup público** (`Enable sign ups` = off)
4. **Authentication → Users:** criar usuário admin manualmente (nunca deixar cadastro aberto)
5. Promover admin:
   ```sql
   UPDATE public."Perfil"
   SET "ativo" = true, "nomeCompleto" = 'Admin INGIFT'
   WHERE "id" = 'UUID_DO_USUARIO';
   ```
6. **Edge Function da landing** (conteúdo público sem expor a anon key no site):
   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_ID
   npx supabase functions deploy landing
   ```
   A função usa `SUPABASE_SERVICE_ROLE_KEY` só no servidor. `verify_jwt = false` em `supabase/config.toml` (somente leitura pública).

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha no `.env.local`:

- `VITE_SUPABASE_URL` — URL do projeto (`https://SEU_REF.supabase.co`), **não** é a chave
- `VITE_SUPABASE_PUBLISHABLE_KEY` — chave `sb_publishable_...` (Dashboard → **API Keys** → Publishable)

Projetos novos do Supabase não usam mais `anon`/`service_role` com esses nomes:

| Antigo | Novo | Onde usar |
|--------|------|-----------|
| anon | `sb_publishable_...` | Browser (`VITE_...`) |
| service_role | `sb_secret_...` | Só servidor / Edge Functions (nunca `VITE_`) |

A **secret** é injetada automaticamente na Edge Function `landing` — não coloque no `.env` do Vite.

Opcional: `VITE_LANDING_API_URL` apontando para a Edge Function. Sem ela, a landing usa dados locais de fallback.

### 3. Rodar localmente

```bash
npm install
npm run dev
```

- Landing: http://localhost:5173
- Admin: http://localhost:5173/admin/login

## Paleta

- Primária: `#3CBDBD`
- Secundária: `#351F52`
- Tema dark/light segue preferência do sistema (toggle manual no header)

## Assets

Originais em `referencia/`. Cópias renomeadas em `public/marca/` e `public/imagens/`.
