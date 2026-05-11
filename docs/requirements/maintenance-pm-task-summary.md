# Maintenance PM Task Summary

This file summarizes the full requirement into followable task groups. The detailed implementation plan is saved at:

`docs/superpowers/plans/2026-05-11-maintenance-pm-roadmap.md`

## Core Direction

- Continue from the current repository and stack.
- Frontend: `frontend/my-app` with Next.js, React, TypeScript, Bootstrap, Tailwind, Axios, Socket.IO Client.
- Backend: `backend` with Express, Prisma, SQL Server, Socket.IO, node-cron, Nodemailer.
- Socket.IO is the realtime standard.
- Predictive Maintenance is future-only for this scope.

## Must Build

1. Repository baseline and documentation.
2. Feature/action permission system.
3. Permission-controlled Home Feature Portal.
4. Backend permission middleware.
5. Frontend permission guards.
6. Socket.IO auth, rooms, and standard event payloads.
7. Realtime dashboard with machine status, production, OEE, PM due/overdue, job/work counts, stock/tool alerts.
8. PM checklist builder, PM planning, execution, approval, and notification.
9. Job Request fast form, list, detail, assignment, comments, file upload.
10. Work Order lifecycle and Kanban board.
11. Tooling storage with borrow/return/damage/calibration due.
12. Spare part inventory with receive/issue/return/adjust/low stock.
13. Integrated analysis and reports with permission-controlled export.
14. Basic 3D machine view with realtime markers and links to Job Request/Machine Detail.
15. Notification center and audit logs.
16. Test plans, UAT checklist, and deployment hardening.

## Must Not Build Now

- Predictive rule engine.
- Sensor trend dashboard.
- Failure prediction.
- Remaining Useful Life calculation.
- AI model training.
- PdM alert generation.
- PdM automatic job request creation.
- Sensor data ingestion for predictive analysis.

## Feature Keys

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

## Permission Actions

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

## Development Order

- [ ] Phase 0: Repository Stabilization
- [ ] Phase 1: Auth + Permission + Home Cards
- [ ] Phase 2: Machine + Realtime Dashboard
- [ ] Phase 3: Preventive Maintenance
- [ ] Phase 4: Job Request + Work Order
- [ ] Phase 5: Tooling + Spare Part
- [ ] Phase 6: Analysis + Reports
- [ ] Phase 7: 3D Machine View
- [ ] Phase 8: Hardening + Test + Deploy

## Tracking Checklist

- [ ] Build passes from `frontend/my-app`.
- [ ] Current lint baseline is documented.
- [ ] Permission tables are added and seeded.
- [ ] `/api/home/features` returns feature cards from backend.
- [ ] Home page renders cards based on backend response.
- [ ] Predictive page is placeholder only.
- [ ] Socket events are documented.
- [ ] Machine/dashboard realtime events work.
- [ ] PM builder and approval flow work.
- [ ] Job Request fast form can be completed within 30 to 60 seconds.
- [ ] Work Order status transitions are enforced.
- [ ] Tooling transactions link to Work Orders.
- [ ] Spare part transactions link to Work Orders.
- [ ] Analysis dashboard covers OEE, downtime, PM, job/work, tooling, spare parts, technician performance.
- [ ] 3D view Level 1 works.
- [ ] Notifications and audit logs work.
- [ ] Unit/API/Socket/E2E/UAT plans are written.
- [ ] Deployment docs are updated.
