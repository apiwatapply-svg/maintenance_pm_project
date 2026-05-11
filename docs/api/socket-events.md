# Socket.IO Events

Socket.IO is the primary realtime communication layer.

## Payload Standard

```json
{
  "event": "job_request:created",
  "timestamp": "2026-05-11T10:00:00.000Z",
  "actor": {
    "user_id": 1,
    "name": "Production User"
  },
  "data": {},
  "meta": {
    "feature": "job_request",
    "plant_id": 1,
    "line_id": 2,
    "machine_id": 10
  }
}
```

## Rooms

```text
global
plant:{plantId}
line:{lineId}
machine:{machineId}
user:{userId}
role:{roleId}
feature:{featureKey}
work_order:{workOrderId}
job_request:{jobRequestId}
pm:{pmId}
tooling:{toolingId}
spare_part:{sparePartId}
```

## Machine / Dashboard

```text
machine:status:update
machine:alarm:new
machine:offline
machine:oee:update
production:count:update
dashboard:summary:update
```

## Preventive Maintenance

```text
pm:plan:created
pm:plan:updated
pm:due:today
pm:overdue
pm:execution:started
pm:execution:submitted
pm:approval:required
pm:approved
pm:rejected
```

## Job Request

```text
job_request:created
job_request:assigned
job_request:status_changed
job_request:comment_added
job_request:converted_to_work_order
```

## Work Order

```text
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
```

## Tooling

```text
tooling:borrowed
tooling:return_due
tooling:returned
tooling:damaged
tooling:calibration_due
```

## Spare Part

```text
spare_part:received
spare_part:issued
spare_part:low_stock
spare_part:out_of_stock
```

## Analysis

```text
analysis:data_refreshed
analysis:report_ready
analysis:export_ready
```

## Permission

```text
permission:updated
feature:access_changed
```

## Notification

```text
notification:new
notification:read
```

## Predictive Future

```text
predictive:future:opened
```

No real Predictive Maintenance alert event should be implemented in the current scope.
