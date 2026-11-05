# Deployment preparation

Do not expose this backend to production data yet. New student passwords are
hashed and the student list and identified debug endpoints have been restricted,
but the rest of the API's authorization still needs review before deployment.
The owner reports that the production database is empty. Provision fresh
accounts securely; no existing-user password migration is planned.

For initial administrator provisioning, `BACKEND/bootstrap-admin.mjs` requires
explicit `ATLAS_URI`, `DB_NAME`, `BOOTSTRAP_ADMIN_USERNAME`, and
`BOOTSTRAP_ADMIN_NAME` environment variables. Run `node bootstrap-admin.mjs`
from `BACKEND` in a trusted terminal and enter the password at its hidden prompt.
The script refuses to run if administrators already exist or its bootstrap marker
is present. Review the exact target database and access before running it. Never
put the password in command arguments, source control, or chat. The script has
been tested with piped and interactive input on a disposable local database;
verify the actual deployment environment before relying on it.

For administrator recovery, a trusted database operator can set `ATLAS_URI`,
`DB_NAME`, and `RECOVER_ADMIN_USERNAME`, then run `node recover-admin.mjs` in a
trusted terminal. Enter the password at the hidden prompt. The command resets
only an active existing admin and invalidates their previous sessions. Student
and mentor recovery uses administrator-issued, 15-minute, single-use links;
administrators must verify identities and deliver links securely. Do not put
passwords or reset links in source control, logs, or chat.

Administrators can deactivate and reactivate student and mentor accounts. These
actions revoke current sessions and reset links but retain the account, help
requests, assignments and uploaded materials. Existing mentor materials remain
available to assigned students. Account DELETE API aliases now deactivate;
they do not permanently erase data. Define a separate reviewed retention and
erasure process before handling real personal data.

The database module exports an asynchronous function. The identified active
route calls have been adjusted to await a connection; database failure paths
still need broader testing.

For a separate Render web service, connect the 2027 repository, set its root
directory to `BACKEND`, build command to `npm ci --omit=dev`, and start command
to `npm start`. Set `NODE_VERSION=22`, `NODE_ENV=production`, `ATLAS_URI`, `DB_NAME=ontrack_2027`, and a strong
`JWT_SECRET` in Render. Do not commit secrets. Confirm the intended database
with its owner before connecting. A 200 from `/api/health` does not verify the
database connection.

For an isolated temporary preview, `BACKEND/render.yaml` is a prepared Render
Blueprint, not an existing deployment. When using it, select that custom file
path; it sets the service root to `BACKEND`, uses a free preview service, and
prompts for `DB_NAME` and `ATLAS_URI` on initial Blueprint creation. Supply a
dedicated **non-production** database and credentials; Render generates a JWT
secret for the new service. Render does not automatically include `sync: false`
values in preview environments, so provision those separately where needed.
The free service is for preview, not the production plan. Review service names,
costs, networking, and the exact target database before creating anything.

After the backend is secured, deployed, and verified, copy
`ontrackapp/vercel.json.example` to `ontrackapp/vercel.json` and replace the
placeholder host with the actual 2027 Render service URL. The file assumes
the Vercel project root is `ontrackapp`; adapt it to the real project settings.
The final rewrite serves the React app for client-side routes. Review any
existing Vercel rewrites before replacing them. Validate the API, uploads, and
client-side routes on a preview deployment before switching production.

New assessment and resource files are stored in MongoDB GridFS and downloaded
through authenticated `/api/files` requests. The owner should confirm database
storage capacity, costs, backups, recovery, and monitoring before enabling
uploads in production. Files are limited to 10 MB and selected document and
image extensions. The old public local uploads route has been removed.

The existing Atlas cluster is on the Free tier and its backups are inactive.
MongoDB documents an optional paid backup subscription for some Free clusters
as a private preview. Select a production-appropriate backup arrangement or independently
manage encrypted backups, retention, monitoring and a tested restore before
accepting user data. Include GridFS files in the restore test. Render advises
against Free web services for production. See:
https://www.mongodb.com/docs/atlas/backup-restore-cluster/
https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/
https://render.com/docs/free

The owner selected separate backups for the free Atlas cluster. See
`BACKUP-AND-RESTORE.md` for the operator checklist, tested local dump/restore
procedure, and production work still required.

For database network access, inspect the new Render service's Connect >
Outbound settings. Its default outbound ranges are shared with other services
in the same region; they are not an identity for this application. Plan and
test the Atlas access list before removing an existing broad entry or relying
on a new one. See https://render.com/docs/outbound-ip-addresses.

Local development: run `npm install` and `npm start` in `BACKEND`, and run
`npm install` and `npm start` in `ontrackapp`. The development proxy targets
the backend at localhost:3000. An empty JSON POST to
`/api/onboardstudents/login` should return 400; a real login also requires a
working database and compatible account records.


Backend integration tests run only against a local MongoDB connection and create
then remove a uniquely named disposable database. To run them in PowerShell with
a disposable MongoDB container (Docker Desktop must be running):

```powershell
docker run -d --rm --name ontrack-security-test-2027 -p 127.0.0.1::27017 mongo:7
$portLine = docker port ontrack-security-test-2027 27017/tcp
$mappedPort = ($portLine -split ':')[-1]
$env:ATLAS_URI = "mongodb://127.0.0.1:$mappedPort"
npm test
docker stop ontrack-security-test-2027
```

Run these commands from `BACKEND`. If MongoDB is still starting, wait for it to
be ready and rerun the test. Never point this test at production.

To test the local frontend-to-backend proxy, first run `npm ci` and `npm run
build` in `ontrackapp`. With a disposable local MongoDB running and `ATLAS_URI`
set as above, run `npm run test:proxy` from `BACKEND`. The test requires port
3000 to be free, starts temporary backend and Vite preview processes, creates
and removes its own test database, and checks login, scoped resource visibility,
and authenticated document upload and download.
This tests the local Vite proxy, not Vercel or Render routing.

Login and reset counters are shared through MongoDB, with hashed client keys and
automatic expiry. Successful logins are not counted against the login limit,
and ordinary authenticated requests do not consume it. Before production,
verify client IP handling and edge protection for the actual hosting and proxy
arrangement; do not assume forwarded headers are trustworthy. Login/reset
requests fail closed if the rate-limit store is unavailable.


The frontend now uses Vite/Vitest. Configure Vercel to install with `npm ci`,
run `npm run build`, use Node 22.12 or later in the Node 22 line or Node 24, and serve the
`build` directory. The build runs targeted React hook lint checks first.
Clean Linux-container installs, builds and frontend tests passed on Node 22 and 24.
Preview the actual deployment and direct-route refreshes before release. For
a temporary Vercel preview, set `CORS_EXTRA_ORIGINS` on its backend to that
preview's exact HTTPS origin (comma-separated if needed); remove unused origins
after testing. Do not use a wildcard or assume unverified domains are safe.
