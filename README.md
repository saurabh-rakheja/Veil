# Loom — Development Setup

## Start everything (one command)

```bash
npm run dev
```

## Start with backend auto-restart on file changes

```bash
npm run dev:watch
```

## Individual servers

```bash
npm run server   # Express backend  → http://localhost:3000
npm run client   # Vite frontend    → http://localhost:5173
npm run admin    # Vite admin app   → http://localhost:5174
```

## First-time setup

```bash
# 1. Install dependencies in each workspace
cd ChatApp && npm install
cd ../client && npm install
cd ../admin && npm install
cd .. && npm install          # root — installs concurrently

# 2. Configure environment
cp ChatApp/.env.example ChatApp/.env   # then fill in values

# 3. Generate admin password hash (run once)
node -e "require('bcryptjs').hash('yourpassword', 12).then(h => console.log(h))"
# Paste the output into ChatApp/.env as ADMIN_PASSWORD_HASH=...

# 4. Promote a Clerk user to admin
node ChatApp/scripts/makeAdmin.js <clerkUserId>

# 5. Start
npm run dev
```

## Required environment variables (`ChatApp/.env`)

| Variable             | Description                                      |
|----------------------|--------------------------------------------------|
| `MONGODB_URI`        | MongoDB connection string                        |
| `CLERK_SECRET_KEY`   | From Clerk dashboard → API Keys                  |
| `PORT`               | Backend port (default: 3000)                     |
| `CLIENT_URL`         | Main frontend origin (default: http://localhost:5173) |
| `ADMIN_URL`          | Admin frontend origin (default: http://localhost:5174) |
| `JWT_SECRET`         | Long random string for admin JWT signing         |
| `ADMIN_PASSWORD_HASH`| bcrypt hash of the admin dashboard password      |

## Terminal output colours

| Label    | Colour  | Server                    |
|----------|---------|---------------------------|
| [SERVER] | magenta | Express backend (port 3000) |
| [CLIENT] | cyan    | Vite main app (port 5173)  |
| [ADMIN]  | yellow  | Vite admin app (port 5174) |
