# Permission Model

The permission system is feature/action based.

## Tables

- `AppFeature`: feature catalog used by home cards, menus, guards, and route permissions.
- `AppPermission`: action-level permission for one feature.
- `AppRole`: role catalog.
- `AppRolePermission`: grants or denies a permission to a role.
- `AppUserRole`: assigns users to roles.
- `AppUserFeatureOverride`: per-user allow/deny override.
- `AuditLog`: records critical user actions.
- `FutureFeature`: stores future-only feature metadata such as Predictive Maintenance.

## Permission Key Format

```text
feature_key.action
```

Examples:

```text
job_request.create
work_order.assign
analysis.export
setting.admin
```

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

## Actions

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

## Merge Rule

Role permissions are loaded first. User feature overrides are applied after role permissions, so an override can allow or deny an inherited role permission.
