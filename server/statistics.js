export const departments = ['Sales', 'Engineering', 'Marketing', 'Operations'];
export const demoRows = Array.from({ length: 12 }, (_, month) => departments.map((department, i) => ({
  month: `2026-${String(month + 1).padStart(2, '0')}-01`, department,
  revenue: Math.round((32000 + month * 2800 + Math.sin(month) * 4500) * [1.5, 1.1, 0.8, 0.6][i]),
  expenses: Math.round((22000 + month * 1300) * [1.1, 1.4, 0.7, 0.8][i]),
  sales: Math.round((130 + month * 13) * [1.5, 1.1, 0.8, 0.6][i]),
  employees: [32, 54, 18, 24][i] + Math.floor(month / 3),
}))).flat();

export function summarize(rows, months = 12, department = 'all') {
  const available = [...new Set(rows.map(r => String(r.month).slice(0, 7)))].sort();
  const selected = new Set(available.slice(-months));
  const filtered = rows.filter(r => selected.has(String(r.month).slice(0, 7)) && (department === 'all' || r.department === department));
  const monthly = [...selected].map(month => {
    const items = filtered.filter(r => String(r.month).startsWith(month));
    return { month, label: new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }), revenue: items.reduce((s, r) => s + Number(r.revenue), 0), expenses: items.reduce((s, r) => s + Number(r.expenses), 0), sales: items.reduce((s, r) => s + Number(r.sales), 0) };
  });
  const revenue = monthly.reduce((s, r) => s + r.revenue, 0);
  const expenses = monthly.reduce((s, r) => s + r.expenses, 0);
  const latest = available.at(-1);
  return { monthly, breakdown: departments.map(name => ({ name, value: filtered.filter(r => r.department === name).reduce((s, r) => s + Number(r.revenue), 0) })).filter(r => r.value > 0), totals: { revenue, expenses, profit: revenue - expenses, employees: filtered.filter(r => String(r.month).startsWith(latest)).reduce((s, r) => s + Number(r.employees), 0) }, period: { start: monthly[0]?.month ?? null, end: monthly.at(-1)?.month ?? null } };
}
