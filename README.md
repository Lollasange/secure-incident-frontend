# Secure Incident Reporting Frontend

Static HTML/CSS/JavaScript frontend for CS 5343 project. The backend is Rust/Axum.

## Deploy for UI preview

Copy `index.html`, `css/`, and `js/` to Apache document root `/var/www/html/` on the **testing** EC2 instance. Avoid replacing files on the production instance until your teammate has reviewed the code.

Visit `http://TEST_EC2_PUBLIC_IP/?preview=reviewer` to preview sample data. Other UI-only views: `?preview=user` and `?preview=admin`.

**Preview mode** never sends API calls, never authenticates, and disables changes. It is only for visual review; it is not role-security testing. Never use real credentials on HTTP. Do not add preview mode to the final production deployment; remove the preview branch once integration tests pass.

## API integration (TODO)

On the team's HTTPS site, use ordinary `/` (no preview parameter). The app calls `GET /api/auth/me` then uses the backend's same-origin HttpOnly cookie. The endpoints in `js/api.js` and `js/incidents.js` follow the Nov 19 API reference. Test them on the HTTPS domain with each role.

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

No inline CSS/JS, no external CDN; API text displayed with `textContent`, not `innerHTML`; same-origin credentials; no browser token storage. Review CSP behavior, error UX, CSRF protections (with teammate), and test 401/403/404/409 responses during integration. Don't use actual incident or personal data in tests.

## GitHub update

Upload the updated `index.html`, `css/style.css`, `js/app.js`, `js/incidents.js`, `js/admin.js`, `js/api.js`, and README to your existing frontend GitHub repository. This is a static website; GitHub upload does not deploy to EC2 automatically.

## Security / release checklist

- Remove `?preview=` handling and hard-coded example records before production deployment (or ensure preview is disabled on production).
- All preview mutations are disabled; verify behavior using a live HTTPS staging backend.
- Test login/logout, 401/403/404/409 errors, user role restrictions, password policy, lockouts, audit verification, and XSS payloads using dummy accounts.
- No credentials, tokens, secrets, or real incident data should be committed.
- Confirm server-side authorization and CSRF protection with the backend developer; frontend hiding buttons is not authorization.
