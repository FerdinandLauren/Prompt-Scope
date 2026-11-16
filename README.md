# PromptScope

An AI-powered Prompt Direction & Evaluation Studio. Build, diagnose, improve, and compare prompts through a structured, measurable workflow.

> **Status:** in development. This README is completed in Milestone 8.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, Recharts, Google Gen AI SDK, Zod, Vitest.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. With no `GEMINI_API_KEY`, the app runs in visibly labelled Demo Mode. Add a key to `.env.local` for Live AI Mode.

## Documents

- [`MASTER.md`](./MASTER.md) — product requirements, architecture, milestones, design specification.
- [`PRODUCT.md`](./PRODUCT.md) — durable product truth.
- [`DESIGN.md`](./DESIGN.md) — visual direction and design system.

## Security

Never commit `.env.local`, API keys, or private credentials. The Gemini key is read only by server-side route handlers.
