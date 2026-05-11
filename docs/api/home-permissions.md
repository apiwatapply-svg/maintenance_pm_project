# Home Feature Permission API

## `GET /api/home/features`

Returns the feature cards the current user can view. Predictive Maintenance can be returned as a future card even when disabled.

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
      "feature_key": "dashboard",
      "title": "Realtime Dashboard",
      "description": "Realtime Dashboard feature",
      "route_path": "/dashboard",
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
        "status": "Future"
      }
    }
  ],
  "message": "OK"
}
```

## Permission Rules

- A normal feature is returned only when `feature.view` is allowed.
- A future feature can be returned as a disabled `Coming Soon` card.
- The frontend must render card state from this response and must not hard-code access.
