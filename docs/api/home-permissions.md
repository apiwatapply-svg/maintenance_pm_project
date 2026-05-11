# Home Feature Permission API

## `GET /api/home/features`

Returns the main module cards the current user can view. The home page is a gateway with four cards:

- `preventive` - Preventive Maintenance
- `predictive` - Predictive Maintenance, shown as an upcoming/future module
- `tool_store` - Tooling & Store, composed from `tooling` and `spare_part` permissions
- `job_request` - Job Request

## Authentication

Requires bearer token.

```http
Authorization: Bearer <token>
```

## Success Response

```json
{
  "success": true,
  "data": [
    {
      "feature_key": "preventive",
      "title": "Preventive Maintenance",
      "description": "Open the completed preventive maintenance workspace.",
      "route_path": "/machines/overall",
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
    },
    {
      "feature_key": "predictive",
      "title": "Predictive Maintenance",
      "description": "Predictive Maintenance feature",
      "route_path": "/predictive-future",
      "enabled": false,
      "future": true,
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
      "summary": {
        "status": "Upcoming"
      }
    },
    {
      "feature_key": "tool_store",
      "title": "Tooling & Store",
      "description": "Manage tool lending, receiving, issuing, and store stock workflows.",
      "route_path": "/tooling",
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
      "summary": {
        "modules": "Tooling + Store"
      }
    }
  ],
  "message": "OK"
}
```

## Permission Rules

- A normal main card is returned only when its underlying `feature.view` is allowed.
- `tool_store.view` is true when either `tooling.view` or `spare_part.view` is allowed.
- A future feature can be returned as a disabled `Upcoming` card.
- The frontend must render card state from this response and must not hard-code access.
