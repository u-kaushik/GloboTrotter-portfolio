# GloboTrotter Portfolio Demo

Static portfolio version of GloboTrotter for recruiter and hiring-manager review.

This build opens directly into the app UI with dummy travel data and the guided walkthrough enabled. It intentionally does not include production backend functions, live authentication, payments, or private environment variables.

## Recruiter Notes

This repository is a portfolio-safe UI sample extracted from a fuller private product codebase. It is meant to demonstrate product thinking, React component structure, interaction design, responsive UI polish, and the guided demo flow without exposing production credentials or backend implementation details.

What is intentionally included:

- React + TypeScript Vite app shell
- Real GloboTrotter UI components and product flows
- Static demo mode with local dummy travel data
- Guided walkthrough overlay for the CV/recruiter experience
- GitHub Pages deployment workflow

What is intentionally omitted or stubbed:

- Live Firebase project configuration and production data
- Serverless functions and AI proxy implementation
- Stripe/RevenueCat payment integration
- Private roadmap, operational docs, and environment variables
- Production mobile/iOS packaging

You may notice placeholder Firebase values in `src/firebase.ts` and forced demo bootstrapping in `src/main.tsx`. Those are deliberate guardrails for this public repository: the deployed site is a static UI demo, not the production system.

The production app architecture behind this demo includes authenticated user profiles, persisted travel logs, AI-generated trip planning/history context, analytics, and monetization integrations. This public repo keeps only the parts that are useful and appropriate for a CV link.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
