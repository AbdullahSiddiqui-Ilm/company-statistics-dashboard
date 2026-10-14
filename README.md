# Company statistics dashboard

Single-page React dashboard with an Express API and PostgreSQL support.

## Development

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:5173. The API runs on port 3001. Without DATABASE_URL, the app uses clearly labelled sample data.

## PostgreSQL

Start a local database with Docker, or use an existing PostgreSQL instance:

```sh
docker compose up -d db
cp .env.example .env
```

Uncomment `DATABASE_URL` in `.env` (the example matches Docker), then run:

```sh
npm run db:seed
npm run dev
```

The seed creates the table and inserts illustrative monthly records for 2026. It preserves existing records. A configured but unavailable database produces an error state rather than silently falling back to sample data. Without DATABASE_URL, all figures are sample data, including illustrative future months. Period filters select the latest available records, not the current calendar date. Currency is GBP; employee count uses the most recent reporting month.

## Features

- Single page with top navigation and responsive layout.
- Revenue, expenses, net profit, and headcount summary cards.
- Revenue/expense area graph, department doughnut chart, and monthly sales bars.
- Three-, six-, and twelve-month filters, department filtering, and refresh.
- CSV export of filtered monthly records and an accessible data table.
- Loading, empty, and error states with retry.

## Production build

```sh
npm run build
npm start
```

Open http://localhost:3001. Express serves the built frontend and API on the same origin. This initial version is intended for local use and has no authentication. Google Fonts is optional; system font fallbacks work offline.

## Checks

```sh
npm test
npm run build
```

The calculation tests can also run without installing dependencies:

```sh
node --test server/statistics.test.js
```

## API

- `GET /api/health`: process status and selected data source (not a database readiness check).
- `GET /api/statistics?months=12&department=all`: aggregated statistics. Months must be 3, 6, or 12; department must be `all`, `Sales`, `Engineering`, `Marketing`, or `Operations`.

Project layout: `client/src/` contains React and CSS, `server/` contains Express and aggregation logic, and `db/` contains the PostgreSQL schema and seed script. Vite proxies `/api` to Express during development. See [Vite's guide](https://vite.dev/guide/), [Express routing](https://expressjs.com/en/5x/starter/basic-routing/), and [Recharts responsive containers](https://recharts.github.io/api/ResponsiveContainer/) for the underlying tooling.
