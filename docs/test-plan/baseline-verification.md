# Baseline Verification

## Date

2026-05-11

## Branch

```text
feature/new
```

## Frontend Build

Command:

```powershell
cd frontend/my-app
npm.cmd run build
```

Result:

```text
Compiled successfully
```

The build generated static pages for the existing app routes:

```text
/
/analysis/machine
/analysis/operator
/calendar
/login
/machines
/machines/areas
/machines/machine-types
/machines/master
/machines/overall
/machines/types
/machines/users
/pm/history/[machineId]
/pm/inspect/[id]
/reports
```

Known non-blocking build notice:

```text
baseline-browser-mapping data is over two months old
```

## Frontend Lint

Command:

```powershell
cd frontend/my-app
npm.cmd run lint
```

Result:

```text
1161 problems
440 errors
721 warnings
```

Main error groups:

- Vendored/minified public Bootstrap JavaScript is being linted:
  - `frontend/my-app/public/bootstrap.bundle.min.js`
  - Many `@typescript-eslint/no-unused-expressions` warnings.
- Existing app code has many `@typescript-eslint/no-explicit-any` errors.
- React hook compiler/immutability errors exist where functions are called before declaration:
  - `frontend/my-app/src/app/reports/page.tsx`
  - `frontend/my-app/src/context/AuthContext.tsx`
- Existing hook dependency warnings exist in reports/auth context files.

## Backend Test Baseline

`backend/package.json` still contains the default placeholder:

```json
"test": "echo \"Error: no test specified\" && exit 1"
```

No backend automated test baseline exists yet. Unit test setup should be introduced before making tests mandatory in CI.

## Interpretation

The current baseline is buildable but not lint-clean. Implementation can proceed with build verification at each checkpoint, while lint cleanup should be tracked as a hardening task before release.
