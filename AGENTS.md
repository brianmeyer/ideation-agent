# Repository Guidelines
 
## Project Structure & Module Organization
- `src/backend/`: Express server (`server.js`), `routes/`, `controllers/`, `services/`, `middleware/`, `config/`, `utils/`.
- `src/frontend/`: React app (`App.jsx`, `main.jsx`, `index.html`), `components/`, `services/`, `styles/`.
- `build/`: Client build artifacts. `data/`, `logs/`, `coverage/`: runtime and reporting outputs.
- Docs: `README.md`, `API.md`, `PROJECT_STRUCTURE.md`, `CONTRIBUTING.md`.
 
## Build, Test, and Development Commands
- `npm run dev`: Run backend (nodemon) and frontend (Vite) together.
- `npm run dev:server` / `npm run dev:client`: Start server or client independently.
- `npm run build:client`: Production build of the React client.
- `npm run preview`: Serve the built client locally.
- `npm start`: Start backend server from `src/backend/server.js`.
- `npm test` | `npm run test:watch` | `npm run test:coverage`: Run Jest tests and coverage.
- `npm run lint`: Lint `src/` with ESLint.
 
## Coding Style & Naming Conventions
- JavaScript/JSX, Node >= 18. Use 2‑space indentation.
- Prefer camelCase for variables/functions, PascalCase for React components.
- Backend files: descriptive kebab‑case (e.g., `user-service.js`); React components: `PascalCase.jsx`.
- Keep modules small and pure where possible; validate inputs.
 
## Testing Guidelines
- Framework: Jest. Place tests next to code or under `__tests__/`.
- Naming: `*.test.js` / `*.test.jsx` (e.g., `controllers/__tests__/session.test.js`).
- Aim for critical-path coverage (routes, controllers, services). Use `npm run test:coverage` locally.
 
## Commit & Pull Request Guidelines
- Conventional Commits (observed in history): `feat:`, `fix:`, `docs:`, etc.
- Commits: present-tense, scoped, small and focused.
- PRs: clear description, linked issues, steps to reproduce/verify, screenshots for UI changes, and updated docs when relevant.
 
## Security & Configuration Tips
- Copy envs: `cp .env.example .env`; never commit secrets.
- Common vars: `NODE_ENV`, `PORT`, Vite dev server port, API keys.
- Rate limiting and sessions are enabled; keep keys/secret values in `.env` only.
