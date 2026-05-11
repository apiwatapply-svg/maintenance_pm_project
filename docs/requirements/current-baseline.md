# Current Baseline

## Verified

- Current branch is `feature/new`.
- Frontend production build passes with `npm.cmd run build` from `frontend/my-app`.
- Backend package currently has no real automated test command; `npm test` is still the default placeholder.
- Current app already contains auth, machine, PM, reports, calendar, notification, and analysis pages.
- The project is committed and pushed on GitHub under `apiwatapply-svg/maintenance_pm_project`.

## Known Gaps

- Frontend lint does not pass yet.
- Permission system is still role/string based and must become feature/action based.
- Socket.IO exists but does not yet enforce authenticated room membership.
- Job Request, Work Order, Tooling, Spare Parts, 3D View, and Predictive Future placeholder are not fully implemented as required.
- Backend API responses are not yet standardized across all routes.
- Database schema does not yet include the new feature permission, job request, work order, tooling, spare part, 3D, future feature, audit, and notification tables from the roadmap.

## Baseline Commands

```powershell
git status --short --branch
cd frontend/my-app
npm.cmd run build
npm.cmd run lint
```

## Result Summary

- `git status --short --branch`: passed, branch is `feature/new`.
- `npm.cmd run build`: passed, Next.js compiled successfully.
- `npm.cmd run lint`: failed as expected from existing lint debt. Details are recorded in `docs/test-plan/baseline-verification.md`.
