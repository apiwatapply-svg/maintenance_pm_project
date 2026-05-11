# Project Analysis

## Overview

This repository contains a Machine Preventive Maintenance (PM) system for factory maintenance operations. The main application is split into an Express/Prisma backend and a Next.js frontend, with supporting documentation, SQL assets, and standalone email utilities.

## Main Components

- `backend/`: Express API, Socket.io real-time events, Prisma SQL Server schema, scheduler, controllers, routes, middleware, and upload handling.
- `frontend/my-app/`: Next.js application with dashboard, machine management, PM inspection, reports, login, notifications, Bootstrap/Tailwind styling, and client-side API configuration.
- `database/`: SQL dumps and database scripts that support setup, migration, and recovery/reference workflows.
- `docs/`: Functional, API, database, deployment, environment, admin, user, and troubleshooting documentation.
- `tools/email/`: Standalone Python email automation utilities for PM and alert notifications.
- `tests/email/`: Standalone Node.js email test tools for SMTP validation.

## Git Readiness Findings

- The parent directory is already a Git repository whose remote points to a different project (`POS_coffee.git`). This project should be committed and pushed as its own repository to avoid mixing unrelated portfolio projects.
- Runtime/generated files were present beside source code: `node_modules`, Python virtual environments, logs, upload folders, build/dist output, local certificates, and `.env` files.
- Some email test code contained hardcoded SMTP credentials. Those values were removed from source and replaced with environment-based configuration.
- SQL dumps were at the project root. They are now grouped under `database/`.
- Standalone email utilities and email test projects were grouped under `tools/email/` and `tests/email/` so the root stays focused on the application.

## Recommended Local Workflow

1. Backend setup: copy `backend/.env.example` to `backend/.env`, set `DATABASE_URL`, then run `npm install` and `npm start` from `backend/`.
2. Frontend setup: run `npm install`, then `npm run dev` or `npm run build` from `frontend/my-app/`.
3. Email tools: copy the relevant `.env.example` in `tools/email/*` or `tests/email/*`, fill local credentials, then run that tool from its own folder.
4. Keep generated/runtime files out of Git; commit only source, docs, package lock files, examples, and database reference scripts.
