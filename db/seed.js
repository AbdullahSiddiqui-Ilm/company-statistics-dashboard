import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { demoRows } from '../server/statistics.js';
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env before seeding PostgreSQL.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  for (const row of demoRows) await client.query('INSERT INTO monthly_statistics (month, department, revenue, expenses, sales, employees) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (month, department) DO NOTHING', [row.month, row.department, row.revenue, row.expenses, row.sales, row.employees]);
  await client.query('COMMIT');
  console.log('Schema created and sample data seeded (existing records preserved).');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
