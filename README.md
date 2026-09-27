1. backend skeleton
2. configure db credentials
3. create tables in DB using Alembic and models
4. create APIs
   1. post items
   2. get items (/by itemID) - with pagination and filtering
5. Create frontend
6. Create next auth (google provider)

## Run backend

```bash
cd backend
uv run arq app.worker.WorkerSettings
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Run Redis with Docker

```bash
docker run -d --name lost-found-redis -p 6379:6379 redis:latest
```
7. Sign Up Flow

Google
 ↓
Auth.js session
 ↓
Next.js obtains authenticated identity
 ↓
Next.js requests API token
 ↓
FastAPI signs API JWT
 ↓
Next.js sends API JWT
 ↓
FastAPI verifies it


# What is profile.sub?

Google gives each account a stable identifier.

For example:

```Google
  ↓
profile.sub
  ↓
"109283746928374..."
```

We store that as: `users.google_id` rather than using the email as the permanent identity.