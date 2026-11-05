# Security remediation status

Do not deploy to production yet. The security review is incomplete and these changes have not been deployed.

## Changes made

- New student passwords are hashed with bcrypt. Student login accepts bcrypt hashes only. The owner reports that the production database is empty, so no existing-user migration is planned. Inactive admins cannot log in via the reviewed admin login paths.
- The student list requires an administrator and excludes the password field. Student debug and test routes, the legacy `/api/user` routes, and the legacy general `/api/auth/login` route are disabled pending redesign. Admin management and access-control routes require admin authentication; admin debug and sample-account routes are disabled.
- Request bodies and passwords are no longer logged by the reviewed login and student-creation paths. Production startup rejects a missing, short, or known fallback JWT secret.
- Newly issued administrator, student and mentor tokens carry only an account ID, role, token version and standard expiry claims; profile details are read from the account instead.
- Help requests are restricted to their creator, with separate administrator review and action routes. Ownership uses both account type and ID; older records without account type require a reviewed migration for creator access. The production database is reported to be empty.
- Student and mentor accounts can be deactivated and reactivated without deleting related records. Access changes revoke existing sessions and reset links. Existing mentor materials and assignments remain available to assigned students, while inactive accounts are excluded from new assignments and active assignment counts. Legacy account DELETE endpoints now deactivate rather than delete.
- The frontend help-request management page requires an administrator, and dashboard responses no longer persist in browser storage. The application removes legacy dashboard cache entries at startup; tests cover student redirection, cache removal, and reloading dashboard data.
- Mentor passwords are hashed; mentor management requires an administrator and lists exclude password hashes.
- `bootstrap-admin.mjs` provisions one initial administrator using explicit database settings and a password read from standard input. It refuses repeated bootstrap attempts and existing administrator records. Tested against a disposable database; production provisioning remains a separate deployment step.
- Student and mentor recovery uses administrator-issued, 15-minute, single-use links. Only a hash of each token is stored; reset invalidates previous sessions. An offline CLI allows a trusted database operator to recover an active administrator account. These flows have local tests; link delivery and production operations need an agreed secure procedure.
- Programme-and-track content requires both fields to match when both are set, including authenticated downloads. A legacy general flag does not override explicit targeting. Unscoped legacy management endpoints require an administrator.
- The primary Render server logs request methods and status codes without request paths. Reviewed route, middleware and database failures log safe error categories and codes rather than raw errors; automated tests exercise log redaction. Alternate server paths and utility scripts still need review.
- Login/reset rate-limit counters are shared in MongoDB with expiring hashed client keys. The proxy topology and client IP attribution still require production verification.
- The frontend build no longer uses Create React App or the Tailwind runtime CDN. Full frontend and backend npm audits report no known advisories as of 4 November 2026; repeat them before release.
- The Docker-backed test `BACKEND/test/security.integration.mjs` creates a uniquely named temporary database and drops it afterward. Run it only against a disposable local MongoDB by setting `ATLAS_URI`, then run `node --test test/security.integration.mjs` from `BACKEND`.

## Still required before release

1. Audit all remaining routes for authentication, roles, ownership, and data exposure. Authentication alone is not sufficient for resource authorization. The reviewed help-request and mentor routes do not cover the whole API.
2. Agree how administrators will verify identities and securely deliver reset links, and verify first-administrator provisioning and administrator recovery in the intended deployment environment. Never email or log passwords. The owner reports that the production database is empty, so migration of plaintext accounts is not planned.
3. Check password handling, access revocation, admin role enforcement, token generation and verification, logging, and debug endpoints throughout the rest of the application. The reviewed routes do not constitute a complete security audit.
4. Historical commits contain a database URI with an embedded credential, JWT secret variables, and private-key material. The tracked frontend environment file has been removed from the working tree, but history still contains the files. The owner must identify and rotate any active credentials and certificates, review access, and assess exposure. Do not publish the values during review. Removing the files does not revoke exposed secrets; coordinate any history rewrite with repository owners.
5. Create the chosen isolated `ontrack_2027` production database and confirm network access, backup, restoration procedure, and secret ownership. Do not use production credentials or data in the local test container.
6. Verify the full frontend against the revised permissions. Disabling legacy endpoints may break flows, and clients that previously consumed the student list without a token must send a valid administrator token.

The `JWT_SECRET` production check requires at least 32 UTF-8 bytes and rejects the known fallback; length alone does not guarantee randomness. Generate a unique high-entropy secret outside source control. Rotating it invalidates existing tokens.
