# Feature Permission Mapping

The system uses two permission layers:

- Legacy login role: `UserMaster.systemRole` and `UserMaster.permissionType`
- Feature permission role: `AppRole`, `AppPermission`, `AppUserRole`, and `AppUserFeatureOverride`

## Default User Mapping

`prisma/seed.js` upserts default feature roles and assigns existing users:

| User condition | Default feature role |
| --- | --- |
| `systemRole = ADMIN` | `admin` |
| `systemRole = USER` and `role` contains `PRODUCTION` | `production_user` |
| Other `USER` accounts | `technician` |

This keeps existing users able to open allowed features even before custom per-user overrides are configured.

## Runtime Rules

- `ADMIN` users bypass feature permission middleware.
- Composite modules can allow any matching permission, for example `Tooling & Store` accepts either `tooling.view` or `spare_part.view`.
- Per-user overrides in `AppUserFeatureOverride` still take precedence when loaded into the permission map.

## Next Admin UI Work

Add a User Permission screen that can:

- Show each user and current feature roles.
- Assign or remove `AppRole` rows through `AppUserRole`.
- Add explicit allow/deny overrides through `AppUserFeatureOverride`.
