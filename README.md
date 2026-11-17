# OptiMeal AI

OptiMeal AI is a multi-organization food operations system for restaurants, educational and hostel messes, corporate cafeterias, catering services, hospitals and institutional canteens, and general food organizations. The UI uses React, Vite, React Router, Lucide and Recharts; the API uses Express and MySQL/InnoDB.

## Features

- Public Soft Lavender landing page, separate login and signup pages, and protected application routes.
- Organization signup creates a private organization and its owner account in one database transaction.
- Email or User ID sign-in, bcrypt password hashing, JWT sessions, duplicate checks and role-aware authorization.
- Signup stores the selected organization type; login and profile refresh retrieve the canonical type from MySQL.
- Organization-specific navigation, terminology, dashboards, records, chart summaries and quick actions for all seven supported types.
- Organization-scoped Calendar & Events with month, week and day views, weekends, Indian national/state holiday data, custom holidays, festivals, working days and special events.
- Backend module authorization and organization-scoped record, billing, report and prediction access.
- Searchable CRUD for students, customers, employees, residents, clients, hospital contacts, events, dated menus, meal attendance and inventory.
- Calendar-aware demand forecasts use historical consumption, meal, weekday/weekend, holiday/festival, event, closure, expected attendance and selected-menu context. Trained forecasts require five historical records; an event-count estimate is labeled as an estimate and never presented as trained AI.
- Menu-priced bills saved atomically with their line items; restaurant order status and event-linked catering invoices; printable invoices.
- Organization-scoped dashboards with real zero-state values, empty charts, activity, and daily, weekly and monthly reports.

New organizations have no pre-filled records. Their dashboard and reports start at zero, and predictions stay unavailable until enough historical attendance is recorded. There are no seeded users, demo credentials or sample-data commands.

## Requirements

- Node.js 18.18 or newer and npm.
- MySQL 8.0 or a compatible MySQL server.

## Database setup

For a new database, from the project root run in PowerShell:

```powershell
Get-Content .\backend\database\schema.sql | mysql -u root -p
```

For an existing database created with the earlier single-workspace schema, first take a backup and run the applicable tenancy migration:

```powershell
Get-Content .\backend\database\migrate-tenancy.sql | mysql -u root -p
```

The tenancy migration preserves existing records in an isolated legacy workspace. If your database is already on the organization-scoped schema, do not rerun it. Then apply the additive organization-module migration once:

```powershell
Get-Content .\backend\database\migrate-organization-modules.sql | mysql -u root -p
```

This migration extends organization types, adds organization-scoped operational/event and meal-registration records, and links invoices to events. It retains existing accounts, bills and records. Do not recreate the database or apply this one-time migration more than once.

For an existing organization-scoped database, back it up and apply the Calendar & Events migration once:

```powershell
Get-Content .\backend\database\migrate-calendar.sql | mysql -u root -p
```

The additive migration adds an optional Indian state preference and calendar, public-holiday and prediction-calendar feature tables. It does not remove or rewrite existing records.

## Configure the API

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

Edit `backend\.env` with the MySQL host, port, user, password, and database name. Set `JWT_SECRET` to a private random value of at least 24 characters. Never put `.env` values in frontend code or commit the file.

Install dependencies:

```powershell
npm install
npm install --prefix .\backend
npm install --prefix .\frontend
```

## Run locally

Open two terminals in the project root.

Terminal 1 — API:

```powershell
npm run dev --prefix .\backend
```

Terminal 2 — frontend:

```powershell
npm run dev --prefix .\frontend
```

Open `http://localhost:5173`. Create your organization using **Get Started**; then sign in using your new email or User ID. The Vite server proxies `/api` to `http://localhost:4000`. The API’s MySQL connectivity check is `http://localhost:4000/api/health`.

## Production build

```powershell
npm run build --prefix .\frontend
```

Run the API without watch mode:

```powershell
npm start --prefix .\backend
```

For deployment, set `VITE_API_URL` to the API `/api` base URL at build time and `CLIENT_ORIGIN` to the frontend origin. Keep database and JWT settings in the backend environment only.

## API overview

All endpoints other than health and signup/login require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API and MySQL health check |
| POST | `/api/auth/signup` | Create an organization and owner account |
| POST | `/api/auth/login` | Sign in with email or User ID |
| GET/PUT | `/api/auth/profile` | Read or update the signed-in user and organization profile |
| GET/POST/PUT/DELETE | `/api/records/{students,customers,employees,residents,clients,hospital_contacts,events}` | Organization-specific directory and event CRUD; access is type-gated |
| GET/POST/PUT/DELETE | `/api/records/{menu,attendance,inventory}` | Organization-scoped menu, service-record and ingredient CRUD; access is type-gated |
| GET/POST/PUT/DELETE | `/api/records/registrations` | Organization-scoped student, employee or resident meal registrations |
| GET | `/api/analytics/dashboard` | Organization-specific dashboard totals, chart inputs and activity |
| GET | `/api/analytics/reports?period=day\|week\|month` | Type-appropriate operations, event, sales, waste and billing summaries |
| GET/POST | `/api/predictions` | Type-specific historical demand forecasts and prediction history |
| GET | `/api/predictions/preview?date=YYYY-MM-DD` | Calendar-aware, non-persisted meal forecasts and clear insufficient-data states |
| GET | `/api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` | Organization events, weekends, holidays and festivals for a date range |
| GET | `/api/calendar/states` | Supported Indian state/union-territory choices |
| PUT | `/api/calendar/state` | Set or clear the organization’s regional calendar preference |
| POST/PUT/DELETE | `/api/calendar/events` | Create, update and delete organization-scoped events |
| GET/POST | `/api/bills` | Scoped invoices and transactional checkout |
| GET | `/api/bills/:id` | Scoped invoice and item details |
| GET | `/api/bills/orders` | Restaurant orders; status updates use `PUT /api/bills/orders/:id/status` |

Supported organization types are `restaurant`, `college_mess`, `hostel_mess`, `corporate_cafeteria`, `catering_service`, `hospital_canteen`, and `other`. College and Hostel Mess workspaces do not expose billing. The holiday catalog is synchronized from the maintained `date-holidays` package for the selected year and Indian state; weekends are calculated from the date. Public holidays and festivals do not imply closure—an organization must explicitly set its open/closed status. As regional calendars vary and provider coverage can change, verify local official dates and add organization-specific events when needed.
