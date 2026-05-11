# Maintenance PM Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the current Maintenance PM project into a permission-controlled realtime maintenance management platform while keeping Predictive Maintenance as a future-only placeholder.

**Architecture:** Keep the existing repository structure and stack: Next.js frontend in `frontend/my-app`, Express/Prisma backend in `backend`, SQL Server via Prisma, and Socket.IO as the realtime standard. Add new modules incrementally behind feature permissions, with backend middleware enforcing access and frontend guards/cards reflecting backend permission responses.

**Tech Stack:** Next.js 16, React 19, TypeScript, Bootstrap, Tailwind CSS, Axios, Socket.IO Client, Recharts, jsPDF, XLSX, Node.js, Express, Prisma, SQL Server, Socket.IO, node-cron, Nodemailer.

---

## Source Requirement

Read from:

`C:/Users/FDB-MM-024/Documents/My_Project/maintenance_pm_project/docs/maintenance_pm_project_plan.md`

Key decisions from the requirement:

- Continue from the current Git repo and current technology stack.
- Socket.IO is the realtime standard.
- Predictive Maintenance is visible as a future feature only.
- Do not implement PdM engine, sensor trend, AI/ML, RUL, PdM alerts, or sensor ingestion in the current scope.
- Every feature must be controlled by feature/action permissions.
- Home cards, page access, API access, button actions, exports, approvals, and realtime event visibility must respect permissions.

## Existing Codebase Map

**Backend currently present:**

- `backend/server.js`: Express app, Socket.IO server, API route mounting, scheduler startup.
- `backend/prisma/schema.prisma`: current SQL Server Prisma schema for machines, PM plans, PM records, users, areas, holidays, date marks, and additional detail defaults.
- `backend/middleware/authMiddleware.js`: token auth middleware.
- `backend/middleware/rbacMiddleware.js`: role-based middleware.
- `backend/controllers/*Controller.js`: existing feature controllers for auth, machine, PM, dashboard, reports, uploads, users, areas, holidays, and related masters.
- `backend/routes/*Routes.js`: current route modules.

**Frontend currently present:**

- `frontend/my-app/src/app/page.tsx`: current first page/home dashboard surface.
- `frontend/my-app/src/app/login/page.tsx`: login page.
- `frontend/my-app/src/app/components/ClientLayout.tsx`: shared app layout.
- `frontend/my-app/src/app/components/Navbar.tsx`: navigation.
- `frontend/my-app/src/app/components/SocketProvider.tsx`: client Socket.IO provider.
- `frontend/my-app/src/context/AuthContext.tsx`: auth state and route protection.
- Existing pages under `machines`, `pm`, `analysis`, `reports`, `calendar`.

**Documentation and support folders:**

- `docs/`: current user/admin/API/database/deployment documentation.
- `database/`: SQL dump/script assets.
- `tools/email/`: standalone email automation tools.
- `tests/email/`: standalone email test tools.

## Target Folder Additions

Create these folders as the related tasks start:

- `frontend/my-app/src/features/home`
- `frontend/my-app/src/features/permissions`
- `frontend/my-app/src/features/job-request`
- `frontend/my-app/src/features/work-order`
- `frontend/my-app/src/features/tooling`
- `frontend/my-app/src/features/spare-parts`
- `frontend/my-app/src/features/three-d`
- `frontend/my-app/src/features/predictive-future`
- `frontend/my-app/src/features/notifications`
- `backend/services`
- `tests/api`
- `tests/e2e`
- `tests/unit`
- `docs/requirements`
- `docs/api`
- `docs/erd`
- `docs/test-plan`

## Feature Keys And Actions

Use these feature keys consistently in database, API, frontend guards, and docs:

```text
dashboard
machine
preventive
job_request
work_order
tooling
spare_part
analysis
three_d
report
notification
user_permission
setting
predictive
```

Use these permission actions:

```text
view
create
edit
delete
approve
reject
assign
export
admin
```

## Development Rule: Unit Tests Travel With Code

Every new backend service, business rule, permission check, status transition, calculation, scheduler helper, and validation helper must be added with unit tests in the same task. Do not defer unit tests to the hardening phase when the code contains testable logic. The hardening phase is for broader API, Socket.IO, E2E, UAT, and regression coverage.

---

### Task 1: Repository And Baseline Stabilization

**Files:**

- Modify: `README.md`
- Create: `docs/requirements/current-baseline.md`
- Create: `docs/test-plan/baseline-verification.md`

- [x] **Step 1: Confirm branch and clean state**

Run:

```powershell
git status --short --branch
```

Expected:

```text
## feature/new
```

No modified source files should appear before implementation starts.

- [x] **Step 2: Verify frontend production build**

Run:

```powershell
cd frontend/my-app
npm.cmd run build
```

Expected:

```text
Compiled successfully
```

- [x] **Step 3: Record current lint baseline**

Run:

```powershell
cd frontend/my-app
npm.cmd run lint
```

Expected current result: lint fails because the existing codebase has many `@typescript-eslint/no-explicit-any`, React hook immutability, and public vendor JS warnings. Capture the top error groups in `docs/test-plan/baseline-verification.md`.

- [x] **Step 4: Document baseline**

Add `docs/requirements/current-baseline.md` with:

```markdown
# Current Baseline

## Verified

- Frontend build passes with `npm.cmd run build` from `frontend/my-app`.
- Backend package has no real automated test command yet.
- Current app already contains auth, machine, PM, reports, calendar, notification, and analysis pages.

## Known Gaps

- Lint does not pass yet.
- Permission system is role string based and must become feature/action based.
- Socket.IO exists but does not yet enforce authenticated room membership.
- Job Request, Work Order, Tooling, Spare Parts, 3D View, and Predictive Future placeholder are not fully implemented as required.
```

- [x] **Step 5: Commit baseline documentation**

Run:

```powershell
git add README.md docs/requirements/current-baseline.md docs/test-plan/baseline-verification.md
git commit -m "docs: record maintenance pm baseline"
```

Expected: commit succeeds.

---

### Task 2: Permission Data Model And Seed

**Files:**

- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.js`
- Create: `backend/services/permission.service.js`
- Create: `tests/unit/permission.service.test.js`
- Create: `docs/erd/permission-model.md`

- [ ] **Step 1: Add permission models to Prisma**

Add these models to `backend/prisma/schema.prisma` using names that do not collide with current `UserMaster`:

```prisma
model AppRole {
  id          Int      @id @default(autoincrement())
  roleKey     String   @unique
  name        String
  description String?
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       AppUserRole[]
  permissions AppRolePermission[]
}

model AppUserRole {
  id        Int      @id @default(autoincrement())
  userId    Int
  roleId    Int
  createdAt DateTime @default(now())

  user UserMaster @relation(fields: [userId], references: [id], onDelete: Cascade)
  role AppRole    @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
}

model AppFeature {
  id          Int      @id @default(autoincrement())
  featureKey  String   @unique
  title       String
  description String?
  routePath   String?
  enabled     Boolean  @default(true)
  future      Boolean  @default(false)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  permissions AppPermission[]
  overrides   AppUserFeatureOverride[]
}

model AppPermission {
  id          Int      @id @default(autoincrement())
  featureId   Int
  action      String
  permissionKey String @unique
  description String?
  createdAt   DateTime @default(now())

  feature AppFeature @relation(fields: [featureId], references: [id], onDelete: Cascade)
  roles   AppRolePermission[]

  @@unique([featureId, action])
  @@index([featureId])
}

model AppRolePermission {
  id           Int      @id @default(autoincrement())
  roleId       Int
  permissionId Int
  allowed      Boolean  @default(true)
  createdAt    DateTime @default(now())

  role       AppRole       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission AppPermission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
}

model AppUserFeatureOverride {
  id        Int      @id @default(autoincrement())
  userId    Int
  featureId Int
  action    String
  allowed   Boolean
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    UserMaster @relation(fields: [userId], references: [id], onDelete: Cascade)
  feature AppFeature @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@unique([userId, featureId, action])
  @@index([userId])
  @@index([featureId])
}

model AuditLog {
  id         Int      @id @default(autoincrement())
  userId     Int?
  featureKey String?
  action     String
  entityType String?
  entityId   String?
  message    String?
  metadata   String?  @db.NVarChar(Max)
  ipAddress  String?
  createdAt  DateTime @default(now())

  user UserMaster? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([featureKey])
  @@index([createdAt])
}

model FutureFeature {
  id          Int      @id @default(autoincrement())
  featureKey  String   @unique
  name        String
  status      String   @default("future")
  targetPhase String?
  description String?  @db.NVarChar(Max)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Also add relation fields to `UserMaster`:

```prisma
  appRoles         AppUserRole[]
  featureOverrides AppUserFeatureOverride[]
  auditLogs        AuditLog[]
```

- [ ] **Step 2: Run Prisma validation**

Run:

```powershell
cd backend
npx.cmd prisma validate
```

Expected:

```text
The schema at prisma/schema.prisma is valid
```

- [ ] **Step 3: Seed features and permissions**

Update `backend/prisma/seed.js` to seed:

```js
const featureDefinitions = [
  ["dashboard", "Realtime Dashboard", "/dashboard", true, false, 10],
  ["machine", "Machine Management", "/machines", true, false, 20],
  ["preventive", "Preventive Maintenance", "/pm", true, false, 30],
  ["job_request", "Job Request", "/job-requests", true, false, 40],
  ["work_order", "Work Order", "/work-orders", true, false, 50],
  ["tooling", "Tooling Storage", "/tooling", true, false, 60],
  ["spare_part", "Spare Part Inventory", "/spare-parts", true, false, 70],
  ["analysis", "Analysis", "/analysis", true, false, 80],
  ["three_d", "3D Machine View", "/three-d", true, false, 90],
  ["report", "Reports", "/reports", true, false, 100],
  ["notification", "Notifications", "/notifications", true, false, 110],
  ["user_permission", "User & Permission", "/permissions", true, false, 120],
  ["setting", "Settings", "/settings", true, false, 130],
  ["predictive", "Predictive Maintenance", "/predictive-future", false, true, 140],
];

const actions = ["view", "create", "edit", "delete", "approve", "reject", "assign", "export", "admin"];
```

Rules:

- Admin role gets all permissions.
- Technician gets `view` on dashboard, machine, preventive, job_request, work_order, tooling, spare_part, notification.
- Production user gets `view/create` on job_request and `view` on dashboard, machine, notification.
- Viewer gets `view` on dashboard, machine, analysis, report, predictive.
- Predictive gets `view` only and remains `future=true`, `enabled=false`.

- [ ] **Step 4: Add permission service tests**

Create `tests/unit/permission.service.test.js` with assertions for:

```js
const { mergePermissions, hasPermission } = require("../../backend/services/permission.service");

test("role permission allows feature action", () => {
  const permissions = mergePermissions({
    rolePermissions: [{ featureKey: "job_request", action: "create", allowed: true }],
    overrides: []
  });

  expect(hasPermission(permissions, "job_request", "create")).toBe(true);
});

test("user override can deny role permission", () => {
  const permissions = mergePermissions({
    rolePermissions: [{ featureKey: "analysis", action: "export", allowed: true }],
    overrides: [{ featureKey: "analysis", action: "export", allowed: false }]
  });

  expect(hasPermission(permissions, "analysis", "export")).toBe(false);
});
```

- [ ] **Step 5: Implement permission service**

Create `backend/services/permission.service.js`:

```js
function permissionKey(featureKey, action) {
  return `${featureKey}.${action}`;
}

function mergePermissions({ rolePermissions = [], overrides = [] }) {
  const map = {};

  for (const item of rolePermissions) {
    map[permissionKey(item.featureKey, item.action)] = Boolean(item.allowed);
  }

  for (const item of overrides) {
    map[permissionKey(item.featureKey, item.action)] = Boolean(item.allowed);
  }

  return map;
}

function hasPermission(permissionMap, featureKey, action) {
  return Boolean(permissionMap[permissionKey(featureKey, action)]);
}

module.exports = {
  permissionKey,
  mergePermissions,
  hasPermission,
};
```

- [ ] **Step 6: Commit permission model**

Run:

```powershell
git add backend/prisma/schema.prisma backend/prisma/seed.js backend/services/permission.service.js tests/unit/permission.service.test.js docs/erd/permission-model.md
git commit -m "feat: add feature permission model"
```

---

### Task 3: Backend Permission Middleware And Home Features API

**Files:**

- Create: `backend/middleware/permissionMiddleware.js`
- Create: `backend/controllers/homeController.js`
- Create: `backend/routes/homeRoutes.js`
- Modify: `backend/server.js`
- Create: `docs/api/home-permissions.md`

- [ ] **Step 1: Implement middleware contract**

Create `backend/middleware/permissionMiddleware.js`:

```js
const prisma = require("../prismaClient");
const { mergePermissions, hasPermission } = require("../services/permission.service");

async function loadUserPermissionMap(userId) {
  const userRoles = await prisma.appUserRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: {
                include: { feature: true },
              },
            },
          },
        },
      },
    },
  });

  const overrides = await prisma.appUserFeatureOverride.findMany({
    where: { userId },
    include: { feature: true },
  });

  const rolePermissions = userRoles.flatMap((userRole) =>
    userRole.role.permissions.map((rolePermission) => ({
      featureKey: rolePermission.permission.feature.featureKey,
      action: rolePermission.permission.action,
      allowed: rolePermission.allowed,
    }))
  );

  return mergePermissions({
    rolePermissions,
    overrides: overrides.map((override) => ({
      featureKey: override.feature.featureKey,
      action: override.action,
      allowed: override.allowed,
    })),
  });
}

function requirePermission(featureKey, action) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication is required.", details: [] },
        });
      }

      const permissions = await loadUserPermissionMap(req.user.id);

      if (!hasPermission(permissions, featureKey, action)) {
        return res.status(403).json({
          success: false,
          error: { code: "PERMISSION_DENIED", message: "You do not have permission.", details: [] },
        });
      }

      req.permissions = permissions;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  loadUserPermissionMap,
  requirePermission,
};
```

- [ ] **Step 2: Implement `/api/home/features`**

Create `backend/controllers/homeController.js`:

```js
const prisma = require("../prismaClient");
const { loadUserPermissionMap } = require("../middleware/permissionMiddleware");
const { hasPermission } = require("../services/permission.service");

const actions = ["view", "create", "edit", "delete", "approve", "reject", "assign", "export", "admin"];

exports.getFeatures = async (req, res, next) => {
  try {
    const permissionMap = await loadUserPermissionMap(req.user.id);
    const features = await prisma.appFeature.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const data = features
      .map((feature) => ({
        feature_key: feature.featureKey,
        title: feature.title,
        description: feature.description,
        route_path: feature.routePath,
        enabled: feature.enabled,
        future: feature.future,
        permissions: Object.fromEntries(
          actions.map((action) => [action, hasPermission(permissionMap, feature.featureKey, action)])
        ),
        summary: feature.future ? { status: "Future" } : {},
      }))
      .filter((feature) => feature.permissions.view || feature.future);

    res.json({ success: true, data, message: "OK" });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 3: Add route and mount**

Create `backend/routes/homeRoutes.js`:

```js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const homeController = require("../controllers/homeController");

router.get("/features", authMiddleware, homeController.getFeatures);

module.exports = router;
```

Modify `backend/server.js`:

```js
app.use("/api/home", require("./routes/homeRoutes"));
```

- [ ] **Step 4: Document API**

Create `docs/api/home-permissions.md` with the exact response shape:

```json
{
  "success": true,
  "data": [
    {
      "feature_key": "dashboard",
      "title": "Realtime Dashboard",
      "enabled": true,
      "future": false,
      "permissions": {
        "view": true,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "reject": false,
        "assign": false,
        "export": false,
        "admin": false
      },
      "summary": {}
    }
  ],
  "message": "OK"
}
```

- [ ] **Step 5: Commit backend home permissions**

Run:

```powershell
git add backend/middleware/permissionMiddleware.js backend/controllers/homeController.js backend/routes/homeRoutes.js backend/server.js docs/api/home-permissions.md
git commit -m "feat: add home feature permission api"
```

---

### Task 4: Frontend Home Feature Portal

**Files:**

- Create: `frontend/my-app/src/features/home/types.ts`
- Create: `frontend/my-app/src/features/home/services/homeApi.ts`
- Create: `frontend/my-app/src/features/home/components/HomeFeatureCard.tsx`
- Create: `frontend/my-app/src/features/home/components/HomeFeatureGrid.tsx`
- Modify: `frontend/my-app/src/app/page.tsx`
- Create: `frontend/my-app/src/app/predictive-future/page.tsx`

- [ ] **Step 1: Add home types**

Create `frontend/my-app/src/features/home/types.ts`:

```ts
export type FeaturePermissions = {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
  reject?: boolean;
  assign?: boolean;
  export?: boolean;
  admin?: boolean;
};

export type HomeFeature = {
  feature_key: string;
  title: string;
  description?: string;
  route_path?: string;
  enabled: boolean;
  future: boolean;
  permissions: FeaturePermissions;
  summary: Record<string, string | number | boolean>;
};
```

- [ ] **Step 2: Add API service**

Create `frontend/my-app/src/features/home/services/homeApi.ts`:

```ts
import axios from "axios";
import config from "@/app/config";
import type { HomeFeature } from "../types";

export async function fetchHomeFeatures(): Promise<HomeFeature[]> {
  const response = await axios.get(`${config.apiServer}/api/home/features`);
  return response.data.data;
}
```

- [ ] **Step 3: Build feature card**

Create `frontend/my-app/src/features/home/components/HomeFeatureCard.tsx`:

```tsx
"use client";

import Link from "next/link";
import type { HomeFeature } from "../types";

type Props = {
  feature: HomeFeature;
};

export function HomeFeatureCard({ feature }: Props) {
  const locked = !feature.permissions.view;
  const disabled = !feature.enabled || locked;
  const href = feature.future ? "/predictive-future" : feature.route_path || "/";

  return (
    <div className={`card h-100 ${disabled ? "opacity-75" : ""}`}>
      <div className="card-body d-flex flex-column gap-2">
        <div className="d-flex justify-content-between align-items-start">
          <h2 className="h5 mb-0">{feature.title}</h2>
          {feature.future && <span className="badge text-bg-warning">Coming Soon</span>}
          {locked && <span className="badge text-bg-secondary">Locked</span>}
        </div>
        <p className="text-muted mb-0">{feature.description || "Open feature workspace."}</p>
        <div className="small text-muted">
          {Object.entries(feature.summary || {}).map(([key, value]) => (
            <div key={key}>
              {key}: {String(value)}
            </div>
          ))}
        </div>
        <div className="mt-auto">
          {disabled && !feature.future ? (
            <button className="btn btn-outline-secondary w-100" disabled>
              Unavailable
            </button>
          ) : (
            <Link className="btn btn-primary w-100" href={href}>
              Open
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build responsive grid**

Create `frontend/my-app/src/features/home/components/HomeFeatureGrid.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { fetchHomeFeatures } from "../services/homeApi";
import type { HomeFeature } from "../types";
import { HomeFeatureCard } from "./HomeFeatureCard";

export function HomeFeatureGrid() {
  const [features, setFeatures] = useState<HomeFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeFeatures()
      .then(setFeatures)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-muted">Loading features...</div>;
  }

  return (
    <div className="row g-3">
      {features.map((feature) => (
        <div className="col-12 col-md-6 col-xl-3" key={feature.feature_key}>
          <HomeFeatureCard feature={feature} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Replace home page entry**

Modify `frontend/my-app/src/app/page.tsx` to render:

```tsx
import { HomeFeatureGrid } from "@/features/home/components/HomeFeatureGrid";

export default function Home() {
  return (
    <main className="container-fluid py-3">
      <HomeFeatureGrid />
    </main>
  );
}
```

- [ ] **Step 6: Add Predictive Future page**

Create `frontend/my-app/src/app/predictive-future/page.tsx`:

```tsx
export default function PredictiveFuturePage() {
  return (
    <main className="container py-4">
      <h1 className="h3">Predictive Maintenance</h1>
      <p className="text-muted mb-0">
        This module is reserved for a future phase. Current scope includes only this placeholder, menu access, permission visibility, and roadmap documentation.
      </p>
    </main>
  );
}
```

- [ ] **Step 7: Build and commit**

Run:

```powershell
cd frontend/my-app
npm.cmd run build
```

Expected: `Compiled successfully`.

Commit:

```powershell
git add frontend/my-app/src/features/home frontend/my-app/src/app/page.tsx frontend/my-app/src/app/predictive-future/page.tsx
git commit -m "feat: add permission based home portal"
```

---

### Task 5: Socket.IO Auth, Rooms, And Event Standard

**Files:**

- Create: `backend/services/socket.service.js`
- Modify: `backend/server.js`
- Modify: `frontend/my-app/src/app/components/SocketProvider.tsx`
- Create: `docs/api/socket-events.md`

- [ ] **Step 1: Add Socket event payload helper**

Create `backend/services/socket.service.js`:

```js
function buildSocketPayload({ event, actor, data = {}, meta = {} }) {
  return {
    event,
    timestamp: new Date().toISOString(),
    actor: actor
      ? {
          user_id: actor.id,
          name: actor.name || actor.username || "Unknown",
        }
      : null,
    data,
    meta,
  };
}

function emitFeatureEvent(io, room, payload) {
  io.to(room).emit(payload.event, payload);
}

module.exports = {
  buildSocketPayload,
  emitFeatureEvent,
};
```

- [ ] **Step 2: Add authenticated room strategy**

Modify `backend/server.js` Socket.IO connection to:

```js
io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId;

  socket.join("global");

  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on("join:feature", (featureKey) => {
    if (typeof featureKey === "string" && featureKey.length <= 50) {
      socket.join(`feature:${featureKey}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
```

This is the first step. JWT verification must replace `userId` trust in the next security hardening task.

- [ ] **Step 3: Update frontend SocketProvider**

Modify `frontend/my-app/src/app/components/SocketProvider.tsx` so the connection sends auth metadata:

```tsx
const socket = io(config.apiServer, {
  auth: {
    token: localStorage.getItem("token"),
  },
});
```

- [ ] **Step 4: Document required events**

Create `docs/api/socket-events.md` listing these event groups:

```text
machine:status:update
machine:alarm:new
machine:offline
machine:oee:update
production:count:update
dashboard:summary:update
pm:plan:created
pm:plan:updated
pm:due:today
pm:overdue
pm:execution:started
pm:execution:submitted
pm:approval:required
pm:approved
pm:rejected
job_request:created
job_request:assigned
job_request:status_changed
job_request:comment_added
job_request:converted_to_work_order
work_order:created
work_order:assigned
work_order:started
work_order:paused
work_order:resumed
work_order:waiting_spare_part
work_order:completed
work_order:closed
work_order:approved
work_order:rejected
tooling:borrowed
tooling:return_due
tooling:returned
tooling:damaged
tooling:calibration_due
spare_part:received
spare_part:issued
spare_part:low_stock
spare_part:out_of_stock
analysis:data_refreshed
analysis:report_ready
analysis:export_ready
permission:updated
feature:access_changed
notification:new
notification:read
predictive:future:opened
```

- [ ] **Step 5: Commit socket foundation**

Run:

```powershell
git add backend/services/socket.service.js backend/server.js frontend/my-app/src/app/components/SocketProvider.tsx docs/api/socket-events.md
git commit -m "feat: add socket event foundation"
```

---

### Task 6: Realtime Dashboard And Machine Simulator

**Files:**

- Create: `backend/services/oee.service.js`
- Create: `backend/scripts/machine_status_simulator.js`
- Modify: `backend/controllers/dashboardController.js`
- Modify: `backend/controllers/machineController.js`
- Modify: `frontend/my-app/src/app/page.tsx` or create `frontend/my-app/src/features/dashboard/*`
- Create: `tests/unit/oee.service.test.js`

- [ ] **Step 1: Add OEE service tests**

Create `tests/unit/oee.service.test.js`:

```js
const { calculateOee } = require("../../backend/services/oee.service");

test("calculates oee from availability performance and quality", () => {
  expect(calculateOee({ availability: 90, performance: 80, quality: 95 })).toEqual({
    availability: 90,
    performance: 80,
    quality: 95,
    oee: 68.4,
  });
});
```

- [ ] **Step 2: Implement OEE service**

Create `backend/services/oee.service.js`:

```js
function round(value) {
  return Math.round(value * 100) / 100;
}

function calculateOee({ availability, performance, quality }) {
  const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;
  return {
    availability: round(availability),
    performance: round(performance),
    quality: round(quality),
    oee: round(oee),
  };
}

module.exports = { calculateOee };
```

- [ ] **Step 3: Emit dashboard events after machine status changes**

In `backend/controllers/machineController.js`, after status-changing writes, emit:

```js
req.io.emit("machine:status:update", {
  event: "machine:status:update",
  timestamp: new Date().toISOString(),
  actor: req.user ? { user_id: req.user.id, name: req.user.name } : null,
  data: machine,
  meta: { feature: "machine", machine_id: machine.id },
});
```

- [ ] **Step 4: Create simulator**

Create `backend/scripts/machine_status_simulator.js`:

```js
const axios = require("axios");

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:5006/api";

async function run() {
  const machines = await axios.get(`${apiBaseUrl}/machines`);
  const first = machines.data.data?.[0] || machines.data?.[0];

  if (!first) {
    console.log("No machine found for simulation.");
    return;
  }

  await axios.post(`${apiBaseUrl}/machines/${first.id}/status`, {
    status: "RUNNING",
    actualCount: Math.floor(Math.random() * 1000),
    targetCount: 1000,
    ngCount: Math.floor(Math.random() * 20),
  });

  console.log(`Updated simulated status for machine ${first.id}`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [ ] **Step 5: Commit dashboard foundation**

Run:

```powershell
git add backend/services/oee.service.js backend/scripts/machine_status_simulator.js backend/controllers/dashboardController.js backend/controllers/machineController.js tests/unit/oee.service.test.js
git commit -m "feat: add realtime dashboard foundation"
```

---

### Task 7: Preventive Maintenance Builder Improvements

**Files:**

- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/controllers/pmController.js`
- Modify: `backend/routes/pmRoutes.js`
- Modify: `frontend/my-app/src/app/pm/inspect/[id]/InspectionForm.tsx`
- Create: `frontend/my-app/src/features/preventive/components/ChecklistBuilder.tsx`
- Create: `docs/api/preventive.md`

- [ ] **Step 1: Preserve existing PM behavior**

Run build before edits:

```powershell
cd frontend/my-app
npm.cmd run build
```

Expected: build passes.

- [ ] **Step 2: Define builder scope**

Document in `docs/api/preventive.md`:

```text
Preventive Maintenance scope:
- PM type setup
- PM checklist section builder
- PM checklist item builder
- PM plan CRUD
- PM execution start/submit
- PM approval approve/reject
- PM due and overdue events
```

- [ ] **Step 3: Add frontend builder component**

Create `frontend/my-app/src/features/preventive/components/ChecklistBuilder.tsx` with props:

```tsx
export type ChecklistBuilderItem = {
  id?: number;
  topic: string;
  description?: string;
  type: "BOOLEAN" | "NUMERIC" | "TEXT" | "DROPDOWN";
  minVal?: number;
  maxVal?: number;
  options?: string[];
  isRequired: boolean;
  order: number;
};

export type ChecklistBuilderProps = {
  items: ChecklistBuilderItem[];
  onChange: (items: ChecklistBuilderItem[]) => void;
};
```

Render add/remove/reorder controls, type selector, required checkbox, and min/max fields for numeric items.

- [ ] **Step 4: Emit PM events**

Add Socket.IO emits in PM create/update/submit/approve/reject:

```text
pm:plan:created
pm:plan:updated
pm:execution:submitted
pm:approved
pm:rejected
```

- [ ] **Step 5: Commit PM builder**

Run:

```powershell
git add backend/controllers/pmController.js backend/routes/pmRoutes.js frontend/my-app/src/features/preventive docs/api/preventive.md
git commit -m "feat: improve preventive checklist builder"
```

---

### Task 8: Job Request Module

**Files:**

- Modify: `backend/prisma/schema.prisma`
- Create: `backend/controllers/jobRequestController.js`
- Create: `backend/routes/jobRequestRoutes.js`
- Modify: `backend/server.js`
- Create: `frontend/my-app/src/app/job-requests/page.tsx`
- Create: `frontend/my-app/src/app/job-requests/new/page.tsx`
- Create: `frontend/my-app/src/app/job-requests/[id]/page.tsx`
- Create: `frontend/my-app/src/features/job-request/*`
- Create: `docs/api/job-requests.md`

- [ ] **Step 1: Add Job Request models**

Add models:

```prisma
model JobRequest {
  id          Int      @id @default(autoincrement())
  requestNo   String   @unique
  machineId   Int
  createdById Int?
  status      String   @default("NEW")
  priority    String   @default("NORMAL")
  category    String?
  symptom     String?
  description String?  @db.NVarChar(Max)
  productionImpact Boolean @default(false)
  machineStopped   Boolean @default(false)
  ngCount      Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  machine Machine @relation(fields: [machineId], references: [id], onDelete: NoAction)
  createdBy UserMaster? @relation(fields: [createdById], references: [id], onDelete: SetNull)
  comments JobRequestComment[]
  files    JobRequestFile[]
}

model JobRequestComment {
  id           Int      @id @default(autoincrement())
  jobRequestId Int
  userId       Int?
  comment      String   @db.NVarChar(Max)
  createdAt    DateTime @default(now())

  jobRequest JobRequest @relation(fields: [jobRequestId], references: [id], onDelete: Cascade)
  user UserMaster? @relation(fields: [userId], references: [id], onDelete: SetNull)
}

model JobRequestFile {
  id           Int      @id @default(autoincrement())
  jobRequestId Int
  filePath     String
  fileType     String?
  createdAt    DateTime @default(now())

  jobRequest JobRequest @relation(fields: [jobRequestId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Implement fast form API**

Endpoints:

```text
GET /api/job-requests
POST /api/job-requests
GET /api/job-requests/:id
PUT /api/job-requests/:id
POST /api/job-requests/:id/assign
POST /api/job-requests/:id/comment
POST /api/job-requests/:id/files
```

Each route uses `authMiddleware` and `requirePermission("job_request", action)`.

- [ ] **Step 3: Implement frontend fast form**

Fast form steps:

```text
1. Machine search/selection
2. Problem category and symptom
3. Priority and impact
4. Evidence photo/file upload
5. Submit
```

- [ ] **Step 4: Emit events**

Emit:

```text
job_request:created
job_request:assigned
job_request:status_changed
job_request:comment_added
```

- [ ] **Step 5: Commit Job Request**

Run:

```powershell
git add backend/prisma/schema.prisma backend/controllers/jobRequestController.js backend/routes/jobRequestRoutes.js backend/server.js frontend/my-app/src/app/job-requests frontend/my-app/src/features/job-request docs/api/job-requests.md
git commit -m "feat: add job request workflow"
```

---

### Task 9: Work Order Module

**Files:**

- Modify: `backend/prisma/schema.prisma`
- Create: `backend/controllers/workOrderController.js`
- Create: `backend/routes/workOrderRoutes.js`
- Modify: `backend/server.js`
- Create: `frontend/my-app/src/app/work-orders/page.tsx`
- Create: `frontend/my-app/src/app/work-orders/[id]/page.tsx`
- Create: `frontend/my-app/src/features/work-order/*`
- Create: `tests/unit/work-order-status.test.js`
- Create: `docs/api/work-orders.md`

- [ ] **Step 1: Add status transition tests**

Create tests for allowed transitions:

```js
const { canTransition } = require("../../backend/services/workOrderStatus.service");

test("allows assigned to in progress", () => {
  expect(canTransition("ASSIGNED", "IN_PROGRESS")).toBe(true);
});

test("rejects closed to in progress", () => {
  expect(canTransition("CLOSED", "IN_PROGRESS")).toBe(false);
});
```

- [ ] **Step 2: Implement status service**

Create `backend/services/workOrderStatus.service.js`:

```js
const transitions = {
  NEW: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["PAUSED", "WAITING_SPARE_PART", "WAITING_PRODUCTION_CONFIRM"],
  PAUSED: ["IN_PROGRESS"],
  WAITING_SPARE_PART: ["IN_PROGRESS"],
  WAITING_PRODUCTION_CONFIRM: ["WAITING_APPROVAL"],
  WAITING_APPROVAL: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
  CANCELLED: [],
};

function canTransition(from, to) {
  return transitions[from]?.includes(to) || false;
}

module.exports = { canTransition };
```

- [ ] **Step 3: Add Work Order models**

Add `WorkOrder`, `WorkOrderLog`, `WorkOrderFile` linked to `JobRequest`, `Machine`, `UserMaster`.

- [ ] **Step 4: Implement Kanban API and actions**

Endpoints:

```text
GET /api/work-orders
POST /api/work-orders
GET /api/work-orders/:id
PUT /api/work-orders/:id
POST /api/work-orders/:id/assign
POST /api/work-orders/:id/start
POST /api/work-orders/:id/pause
POST /api/work-orders/:id/resume
POST /api/work-orders/:id/submit
POST /api/work-orders/:id/production-confirm
POST /api/work-orders/:id/approve
POST /api/work-orders/:id/reject
POST /api/work-orders/:id/close
```

- [ ] **Step 5: Emit events and commit**

Emit the work order events required by `docs/api/socket-events.md`.

Commit:

```powershell
git add backend/services/workOrderStatus.service.js backend/prisma/schema.prisma backend/controllers/workOrderController.js backend/routes/workOrderRoutes.js backend/server.js frontend/my-app/src/app/work-orders frontend/my-app/src/features/work-order tests/unit/work-order-status.test.js docs/api/work-orders.md
git commit -m "feat: add work order lifecycle"
```

---

### Task 10: Tooling And Spare Part Modules

**Files:**

- Modify: `backend/prisma/schema.prisma`
- Create: `backend/controllers/toolingController.js`
- Create: `backend/controllers/sparePartController.js`
- Create: `backend/routes/toolingRoutes.js`
- Create: `backend/routes/sparePartRoutes.js`
- Modify: `backend/server.js`
- Create: `frontend/my-app/src/app/tooling/page.tsx`
- Create: `frontend/my-app/src/app/spare-parts/page.tsx`
- Create: `frontend/my-app/src/features/tooling/*`
- Create: `frontend/my-app/src/features/spare-parts/*`
- Create: `tests/unit/spare-part-stock.test.js`

- [ ] **Step 1: Add stock calculation test**

Create:

```js
const { calculateStockAfterTransaction } = require("../../backend/services/sparePartStock.service");

test("stock issue reduces quantity", () => {
  expect(calculateStockAfterTransaction({ current: 10, type: "ISSUE", quantity: 3 })).toBe(7);
});

test("stock receive increases quantity", () => {
  expect(calculateStockAfterTransaction({ current: 10, type: "RECEIVE", quantity: 3 })).toBe(13);
});
```

- [ ] **Step 2: Implement Tooling functions**

Functions:

```text
Tool master
Tool category
Tool location
Borrow tool
Return tool
Damage record
Calibration due
Tool history
QR code field
Link borrow transaction to Work Order
```

- [ ] **Step 3: Implement Spare Part functions**

Functions:

```text
Spare part master
Stock receive
Stock issue
Stock return
Stock adjust
Low stock alert
Out of stock alert
Machine compatibility
Usage history
Cost analysis fields
Link issue transaction to Work Order
```

- [ ] **Step 4: Emit events**

Tooling:

```text
tooling:borrowed
tooling:returned
tooling:damaged
tooling:return_due
tooling:calibration_due
```

Spare part:

```text
spare_part:received
spare_part:issued
spare_part:low_stock
spare_part:out_of_stock
```

- [ ] **Step 5: Commit resources modules**

Run:

```powershell
git add backend/prisma/schema.prisma backend/controllers/toolingController.js backend/controllers/sparePartController.js backend/routes/toolingRoutes.js backend/routes/sparePartRoutes.js backend/server.js frontend/my-app/src/app/tooling frontend/my-app/src/app/spare-parts frontend/my-app/src/features/tooling frontend/my-app/src/features/spare-parts tests/unit/spare-part-stock.test.js
git commit -m "feat: add tooling and spare part workflows"
```

---

### Task 11: Analysis And Reports

**Files:**

- Modify: `backend/controllers/reportController.js`
- Create: `backend/controllers/analysisController.js`
- Create: `backend/routes/analysisRoutes.js`
- Modify: `backend/server.js`
- Modify: `frontend/my-app/src/app/analysis/machine/page.tsx`
- Modify: `frontend/my-app/src/app/analysis/operator/page.tsx`
- Create: `frontend/my-app/src/features/analysis/*`
- Create: `docs/api/analysis.md`

- [ ] **Step 1: Add analysis endpoints**

Implement:

```text
GET /api/analysis/overview
GET /api/analysis/oee
GET /api/analysis/downtime
GET /api/analysis/job-requests
GET /api/analysis/work-orders
GET /api/analysis/pm-compliance
GET /api/analysis/tooling
GET /api/analysis/spare-parts
GET /api/analysis/technicians
POST /api/analysis/export
```

- [ ] **Step 2: Enforce export permission**

Use:

```js
requirePermission("analysis", "export")
```

on `POST /api/analysis/export`.

- [ ] **Step 3: Connect charts to backend data**

Frontend analysis pages must load from `analysisApi.ts` and render:

```text
OEE
Downtime
PM compliance
Job request aging
Work order status
Tool usage
Spare part usage
Technician performance
```

- [ ] **Step 4: Emit refresh events**

Emit:

```text
analysis:data_refreshed
analysis:report_ready
analysis:export_ready
```

- [ ] **Step 5: Commit analysis**

Run:

```powershell
git add backend/controllers/analysisController.js backend/routes/analysisRoutes.js backend/server.js frontend/my-app/src/features/analysis frontend/my-app/src/app/analysis docs/api/analysis.md
git commit -m "feat: add integrated analysis module"
```

---

### Task 12: 3D Machine View

**Files:**

- Modify: `frontend/my-app/package.json`
- Create: `frontend/my-app/src/app/three-d/page.tsx`
- Create: `frontend/my-app/src/features/three-d/*`
- Create: `backend/controllers/threeDController.js`
- Create: `backend/routes/threeDRoutes.js`
- Modify: `backend/server.js`
- Create: `docs/requirements/three-d-view.md`

- [ ] **Step 1: Add Three.js dependencies**

Run:

```powershell
cd frontend/my-app
npm.cmd install three @types/three
```

- [ ] **Step 2: Build Level 1 3D scope**

Implement:

```text
Show 3D model or basic factory plane
Machine markers
Marker color by machine status
Click marker popup
Open Job Request from popup
Open Machine Detail from popup
Realtime marker color update
```

- [ ] **Step 3: Add mapping API**

Endpoints:

```text
GET /api/three-d/models
POST /api/three-d/models
GET /api/three-d/machine-mappings
POST /api/three-d/machine-mappings
```

- [ ] **Step 4: Verify with build**

Run:

```powershell
cd frontend/my-app
npm.cmd run build
```

Expected: build passes.

- [ ] **Step 5: Commit 3D view**

Run:

```powershell
git add frontend/my-app/package.json frontend/my-app/package-lock.json frontend/my-app/src/app/three-d frontend/my-app/src/features/three-d backend/controllers/threeDController.js backend/routes/threeDRoutes.js backend/server.js docs/requirements/three-d-view.md
git commit -m "feat: add basic 3d machine view"
```

---

### Task 13: Notifications, Audit Log, And Settings

**Files:**

- Modify: `backend/prisma/schema.prisma`
- Create: `backend/controllers/notificationController.js`
- Create: `backend/routes/notificationRoutes.js`
- Create: `backend/services/audit.service.js`
- Create: `backend/middleware/auditMiddleware.js`
- Modify: `frontend/my-app/src/app/components/NotificationCenter.tsx`
- Create: `frontend/my-app/src/app/settings/page.tsx`
- Create: `docs/api/notifications.md`

- [ ] **Step 1: Add notification tables**

Add:

```prisma
model AppNotification {
  id        Int      @id @default(autoincrement())
  userId    Int?
  title     String
  message   String   @db.NVarChar(Max)
  featureKey String?
  readAt    DateTime?
  createdAt DateTime @default(now())

  user UserMaster? @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Implement notification API**

Endpoints:

```text
GET /api/notifications
POST /api/notifications/:id/read
POST /api/notifications/read-all
```

- [ ] **Step 3: Emit notification events**

Emit:

```text
notification:new
notification:read
```

- [ ] **Step 4: Add audit helper**

Create `backend/services/audit.service.js`:

```js
const prisma = require("../prismaClient");

async function writeAuditLog({ userId, featureKey, action, entityType, entityId, message, metadata, ipAddress }) {
  return prisma.auditLog.create({
    data: {
      userId,
      featureKey,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress,
    },
  });
}

module.exports = { writeAuditLog };
```

- [ ] **Step 5: Commit notification and audit**

Run:

```powershell
git add backend/prisma/schema.prisma backend/controllers/notificationController.js backend/routes/notificationRoutes.js backend/services/audit.service.js backend/middleware/auditMiddleware.js frontend/my-app/src/app/components/NotificationCenter.tsx frontend/my-app/src/app/settings docs/api/notifications.md
git commit -m "feat: add notifications and audit logging"
```

---

### Task 14: Testing, UAT, And Release Documentation

**Files:**

- Create: `docs/test-plan/unit-test-plan.md`
- Create: `docs/test-plan/api-test-plan.md`
- Create: `docs/test-plan/socket-test-plan.md`
- Create: `docs/test-plan/e2e-test-plan.md`
- Create: `docs/test-plan/uat-checklist.md`
- Modify: `docs/deployment-guide.md`
- Modify: `README.md`

- [ ] **Step 1: Write unit test plan**

Required unit coverage:

```text
OEE calculation
Permission check
PM schedule generation
Job request validation
Work order status transition
Tool borrow/return
Spare part stock calculation
```

- [ ] **Step 2: Write API test plan**

Required API coverage:

```text
Auth
Permission denied
CRUD
Validation errors
Pagination
File upload
Workflow transitions
```

- [ ] **Step 3: Write Socket.IO test plan**

Required socket coverage:

```text
Connect with token
Reject invalid token
Join correct rooms
Machine status update event
Job request created event
Work order status changed event
Permission update event
```

- [ ] **Step 4: Write E2E flow**

Main flow:

```text
Login
Open Home
Create Job Request
Assign Technician
Start Work Order
Borrow Tool
Issue Spare Part
Close Work Order
Approve
Open Analysis
Verify KPI changed
```

- [ ] **Step 5: Write UAT checklist**

User groups:

```text
Admin
Maintenance Manager
Technician
Production User
Store Keeper
Management Viewer
```

- [ ] **Step 6: Final verification**

Run:

```powershell
cd frontend/my-app
npm.cmd run build
```

Run backend smoke test:

```powershell
cd backend
node server.js
```

Expected:

```text
Server is running on port 5006
```

- [ ] **Step 7: Commit docs**

Run:

```powershell
git add docs/test-plan docs/deployment-guide.md README.md
git commit -m "docs: add maintenance pm test and uat plan"
```

---

## Phase Summary

| Phase | Focus | Primary Deliverable |
|---|---|---|
| 0 | Stabilization | Baseline docs, build verification, known gaps |
| 1 | Auth + Permission + Home | Permission DB, middleware, home cards, predictive future card |
| 2 | Machine + Dashboard | Realtime dashboard, machine status events, OEE, simulator |
| 3 | Preventive Maintenance | PM template/checklist builder, plan, execution, approval |
| 4 | Job Request + Work Order | Fast request form, work order lifecycle, realtime updates |
| 5 | Tooling + Spare Part | Borrow/return, stock movement, low stock, work order linkage |
| 6 | Analysis + Reports | OEE, downtime, PM, job/work, resources, export |
| 7 | 3D View | Basic machine visual navigation with realtime status |
| 8 | Hardening | Tests, audit, docs, UAT, release readiness |

## Acceptance Checklist

- [ ] Home cards are returned by `/api/home/features`, not hard-coded in frontend access logic.
- [ ] Predictive Maintenance card exists and opens only a future placeholder page.
- [ ] Predictive Maintenance has no PdM engine, sensor trend, AI/ML, or alert generation.
- [ ] Backend APIs enforce `requirePermission(featureKey, action)`.
- [ ] Frontend pages and actions use permission guards.
- [ ] Socket.IO sends standardized payloads with `event`, `timestamp`, `actor`, `data`, and `meta`.
- [ ] Machine, PM, job request, work order, tooling, spare part, analysis, permission, and notification events are documented.
- [ ] Job Request can be submitted in 30 to 60 seconds.
- [ ] Work Order supports the required Kanban states and transition rules.
- [ ] Tooling and spare part transactions link to Work Orders.
- [ ] Analysis connects data from machine, PM, job request, work order, tooling, and spare part modules.
- [ ] 3D View Level 1 can open Job Request and Machine Detail from a machine marker.
- [ ] Excel/PDF export is controlled by permission.
- [ ] Audit logs exist for critical actions.
- [ ] Build passes before release.
- [ ] UAT checklist is complete for Admin, Maintenance Manager, Technician, Production User, Store Keeper, and Management Viewer.

## Self-Review Notes

- Spec coverage: all major requirement sections are mapped to tasks: repository stabilization, permission/home cards, realtime Socket.IO, dashboard, PM, job request, work order, tooling, spare part, analysis, 3D, predictive future, testing, UAT, and docs.
- Intentional deferral: real PdM logic is excluded because the requirement explicitly says future placeholder only.
- Risk: current frontend lint baseline is not clean. Treat lint cleanup as a prerequisite hardening task before requiring lint to block merges.
- Risk: Prisma model additions must be validated against existing `UserMaster` relations before migration generation.
