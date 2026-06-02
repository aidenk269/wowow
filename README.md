# Pong

Modern minimalist Pong in the browser — navy & sand theme, solo vs AI, online 1v1 with room codes, and optional Google stats.

## Features

- **Solo vs AI** — Easy / Medium / Hard
- **Online** — Host gets a room code; friend joins with the same code
- First to **11** points; 3-2-1 countdown; mutual pause online
- **Stats (optional)** — Sign in with Google after a match to save wins/losses

## Run locally (two terminals)

**Terminal 1 — Python game server:**

```bash
cd server
pip install -r requirements.txt
# Copy ../.env.example to ../.env and fill in Supabase keys for stats
python app.py
```

**Terminal 2 — React frontend:**

```bash
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` and `/socket.io` to Flask.

## Stats setup (Phase C — optional)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Authentication → Providers → Google** — enable and add OAuth credentials.
3. **Project Settings → API** — copy URL, anon key, and JWT secret.
4. Create `.env` in the project root (see `.env.example`):

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_JWT_SECRET=your-jwt-secret
   ```

5. Restart Flask so it reads `SUPABASE_JWT_SECRET`.

**Stats storage:**

- **Default (easy):** Flask stores stats in `server/stats.db` (SQLite). No extra Supabase DB setup.
- **Production:** Run `supabase/schema.sql` in the SQL editor, then add `SUPABASE_SERVICE_ROLE_KEY` to `.env` so stats live in Postgres.

## Production build

```bash
npm run build
cd server
python app.py
```

Flask serves `dist/` at http://127.0.0.1:5000

## Stack

- Frontend: React 19, TypeScript, Vite, Socket.IO client, Supabase Auth
- Backend: Python 3, Flask, Flask-SocketIO, PyJWT
