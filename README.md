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

## Scope and follow-ups

This package implements login/logout and incident list, create, detail, review status, and comments UI. **Not yet implemented:** change password, administrator user management, and audit logs. Backend has to enforce authorization; UI role visibility is not a security boundary.

## Security notes

No inline CSS/JS, no external CDN; API text displayed with `textContent`, not `innerHTML`; same-origin credentials; no browser token storage. Review CSP behavior, error UX, CSRF protections (with teammate), and test 401/403/404/409 responses during integration. Don't use actual incident or personal data in tests.
