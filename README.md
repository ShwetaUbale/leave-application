# Leave Application

React (Vite) + Node/Express + PostgreSQL (Docker).

## Run in development
```bash
docker compose up -d db      # PostgreSQL on localhost:5433
npm run install:all          # install root, backend and frontend deps
npm run dev                  # API :4000, web http://localhost:5173
```

## Structure
- `backend/` – Express + PostgreSQL API
- `frontend/` – React (Vite) web app
Tables and demo data are created automatically on first start.

## Run everything in Docker
```bash
docker compose up --build    # app at http://localhost:8080
```
Set `JWT_SECRET` in your environment for anything beyond local use.

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Employee | employee@example.com | employee123 |
| Manager | manager@example.com | manager123 |
| Admin | admin@example.com | admin123 |

## Features
- Login with employee / manager / admin roles
- Apply for leave (weekdays counted, overlap and balance checks)
- Per-type leave balances (annual, sick, casual, unpaid)
- Manager/admin approve or reject with comments (cannot review own requests)
- Team calendar of approved leave
- Admin user management

