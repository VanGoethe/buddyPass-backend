# BuddyPass Backend

Node.js API for sharing streaming-service accounts. Users request a slot on a service provider. When a seat is free they receive it, and the account email and password can be revealed to that slot holder. Admins manage providers, subscriptions, countries, and currencies.

## Stack

Express 4, TypeScript, Prisma, PostgreSQL. Optional Redis for shared rate limits. JWT access tokens last 15 minutes. Refresh tokens rotate and are stored as SHA-256 hashes. Google sign-in is optional.

## What the API does

- Register, log in, refresh, and log out. Google OAuth links an existing account only when that account is already verified.
- Admins create shared subscriptions. The streaming password is encrypted with AES-256-GCM, not hashed.
- Slot assignment runs in a serializable transaction and will not overbook `maxSlots`. Pending requests are filled first-in, first-out when capacity appears. Expired subscriptions release their slots on an hourly sweep.
- `GET /subscriptions/slots/:slotId/credentials` returns the email and password to the active slot owner or an admin. Responses are not cached.
- `GET /health` checks the database. Interactive docs are at `/api-docs`.

Payments, outbound email, and an admin UI are not part of this service.

## Setup

```bash
cp env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Required environment variables: `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), `JWT_REFRESH_SECRET` (at least 32 characters), and `CREDENTIALS_ENCRYPTION_KEY` (base64-encoded 32 bytes). The process exits if any of those are missing or invalid. See `env.example` for the rest, including optional `REDIS_URL` and `TRUST_PROXY`.

Create an admin (both variables are required; the script does not print the password):

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='a strong password' npm run create-admin
```

## Scripts

- `npm run dev` — reload on change
- `npm run build` / `npm start` — compile and run
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm test` — Jest
- `npm run migrate` — `prisma migrate dev`

## Docker

`docker-compose.yml` starts Postgres and the API. Redis is behind the `redis` profile: `docker compose --profile redis up`.

## Secret rotation

`.env` was committed in the initial history of this repository. Treat every value that was in that file as compromised.

- `JWT_SECRET` and `JWT_REFRESH_SECRET` must be new values of at least 32 characters. Existing access tokens stop working when `JWT_SECRET` changes. Existing refresh tokens should be discarded (the migration already replaces the refresh-token table).
- `CREDENTIALS_ENCRYPTION_KEY` must be a new base64-encoded 32-byte key. Passwords encrypted with an older key cannot be decrypted. Subscriptions that still have a bcrypt password hash are marked `needsCredentialReset`; an admin has to enter the password again.
- Rotate the database password in `DATABASE_URL` on the database host, then update `.env`. This repository cannot invalidate that password by itself.
- Rotate `GOOGLE_CLIENT_SECRET` in Google Cloud Console, then update `.env`.
- Do not commit `.env`. History was not rewritten. GitHub Actions runs gitleaks against the working tree (`--no-git`) so the old commit does not fail CI, but the secrets are still in history until you rewrite it yourself.

## Tests

Jest loads `tests/setEnv.ts` before the suite so a local run has JWT and encryption defaults when `.env` does not. Integration and end-to-end tests use `DATABASE_URL` and clean up rows they create. Point that URL at a database you can wipe, not production.

## Layout

Controllers handle HTTP. Services hold business rules. Repositories talk to Prisma. Request bodies are validated with Zod, and those schemas are registered as OpenAPI components.
