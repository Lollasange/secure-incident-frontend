# Secure Incident Reporting Frontend

Static HTML/CSS/JavaScript frontend for CS 5343 project. The backend is Rust/Axum.

## Deploy

Copy only `index.html`, `favicon.svg`, `css/` and `js/` to `/var/www/html/` on the EC2 instance (not this README). The site only works at `https://app.cs5343incidents.click/`: the session cookie is `Secure` and `__Host-` prefixed, so it is never sent over HTTP or to another host.

## API integration

The app calls `GET /api/auth/me` on load, then relies on the backend's same-origin HttpOnly session cookie. The endpoints follow the Nov 19 API reference:

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/incidents`, `POST /api/incidents`
- `GET /api/incidents/{id}`
- Reviewer: `PATCH /api/incidents/{id}/status` (passes `version`)
- Reviewer/admin: `POST /api/incidents/{id}/comments`
- Account: `POST /api/auth/password`
- Admin: `GET/POST /api/admin/users`, `PATCH /api/admin/users/{id}`
- Admin: `GET /api/admin/audit?limit=200`, `GET /api/admin/audit/verify`

## Scope and follow-ups

This package includes login/logout; incident list, create, detail, reviewer status, and comments; change password for all roles; administrator user creation, role changes, activation/deactivation, password reset; and audit-log listing and integrity verification. All endpoints require integration testing. Backend must enforce authorization; UI role visibility is not a security boundary.

## Security notes

No inline CSS/JS, no external CDN; API text displayed with `textContent`, not `innerHTML`; same-origin credentials; no browser token storage; passwords only in `type="password"` fields. CSRF: the session cookie is `SameSite=Strict` and the API only accepts `application/json` bodies, which a form on another site cannot send. Don't use actual incident or personal data in tests.

## GitHub update

Upload the updated `index.html`, `favicon.svg`, `css/style.css`, `js/app.js`, `js/incidents.js`, `js/admin.js`, `js/api.js`, and README to your existing frontend GitHub repository. This is a static website; GitHub upload does not deploy to EC2 automatically.

## Security / release checklist

- Test login/logout, 401/403/404/409 errors, user role restrictions, password policy, lockouts, audit verification, and XSS payloads using dummy accounts.
- No credentials, tokens, secrets, or real incident data should be committed.
- Confirm server-side authorization and CSRF protection with the backend developer; frontend hiding buttons is not authorization.
