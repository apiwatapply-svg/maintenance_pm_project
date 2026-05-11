# Job Request API

Job Request is optimized for minimum typing. The frontend uses searchable dropdowns for machine selection and fixed option lists, with `OTHER` fallback fields only when needed.

## Machine Selection

`GET /api/job-requests/options`

Returns:

- `machines`: searchable labels in `Zone / Type / Machine No - Name` format.
- `categories`: dropdown options with `OTHER`.
- `symptoms`: dropdown options with `OTHER`.

Machine metadata comes from:

- Zone: `Machine.machineMaster.machineType.area`
- Type: `Machine.machineMaster.machineType`
- Machine No.: `Machine.code`

## Create

`POST /api/job-requests`

Required:

- `machineId`
- `category`
- `symptom`

Optional:

- `categoryOther` when `category = OTHER`
- `symptomOther` when `symptom = OTHER`
- `priority`
- `productionImpact`
- `machineStopped`
- `ngCount`
- `description`

The backend generates `requestNo` as `JR-YYYYMMDD-####`.

## Events

Created requests emit:

```text
job_request:created
```

Payload follows the standard Socket.IO payload in `docs/api/socket-events.md`.

## Permissions

Routes require authentication and feature permissions:

- `job_request.view`
- `job_request.create`
- `job_request.edit`
