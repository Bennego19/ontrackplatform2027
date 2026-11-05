# OnTrack Connect frontend

Use Node.js 22.12 or newer within the Node 22 release line, or Node.js 24. From this directory:

- `npm ci` installs the locked dependencies, including build and test tools.
- `npm start` starts the development server on port 3001 and proxies `/api` to the backend on port 3000.
- `npm test` runs the frontend tests once.
- `npm run lint` checks the React hook rules configured for this project.
- `npm run build` runs the hook checks and writes the production application to `build`.
- `npm run preview` serves the built application locally on port 3002 and proxies `/api` to port 3000.

The frontend uses same-origin `/api` URLs. Production hosting must route those
requests to the verified backend and serve `index.html` for client-side routes.
See `../DEPLOYMENT-NOTES.md` and the go-live checklist before deploying. The
example Vercel configuration is inactive until its backend URL is replaced.
