# Next.js + Node.js Monorepo

This repo is set up as an npm workspaces monorepo with:

- `apps/web`: Next.js (React + TypeScript)
- `apps/api`: Node.js + Express API

## Prerequisites

- Node.js 20+ recommended
- npm 10+

## Install

```bash
npm install
```

## Run both apps in development

```bash
npm run dev
```

- Web app: [http://localhost:3000](http://localhost:3000)
- API health route: [http://localhost:4000/health](http://localhost:4000/health)
- API sample route: [http://localhost:4000/api/message](http://localhost:4000/api/message)

## Run each app separately

```bash
npm run dev:web
npm run dev:api
```

## Build/start web app

```bash
npm run build
npm run start
```