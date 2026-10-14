import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ChartNoAxesCombined,
  ArrowDownToLine,
  ArrowUpRight,
  Wallet,
  Users,
  TrendingUp,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import "./styles.css";
import { fetchStatistics } from "./api.js";
import { AuthGate } from "./Auth.jsx";

const colors = ["#6c5ce7", "#9b8ff3", "#c0b8fa", "#ddd9fc"];
const money = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
const number = (value) => new Intl.NumberFormat("en-GB").format(value);
const compact = (value) => `£${Math.round(value / 1000)}k`;
function exportCsv(data) {
  const rows = [
    "Month,Revenue GBP,Expenses GBP,Sales",
    ...data.monthly.map(
      (r) => `${r.month},${r.revenue},${r.expenses},${r.sales}`,
    ),
  ];
  const url = URL.createObjectURL(
    new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "company-statistics.csv";
  link.click();
  URL.revokeObjectURL(url);
}
function Panel({ id, title, subtitle, children, className = "" }) {
  return (
    <section id={id} className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="panel-dot" aria-hidden="true">
          •••
        </span>
      </div>
      {children}
    </section>
  );
}
function Dashboard({ user, onSignedOut }) {
  const [months, setMonths] = useState("12");
  const [department, setDepartment] = useState("all");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [active, setActive] = useState("overview");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchStatistics(
      `/api/statistics?months=${months}&department=${encodeURIComponent(department)}`,
      { signal: controller.signal },
    )
      .then(setData)
      .catch((err) => {
        if (!controller.signal.aborted) {
          if (err.status === 401) onSignedOut();
          else setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [months, department, refresh]);
  const cards = data
    ? [
        {
          title: "Total revenue",
          value: money(data.totals.revenue),
          icon: Wallet,
          note: "Across the selected period",
          tone: "purple",
        },
        {
          title: "Total expenses",
          value: money(data.totals.expenses),
          icon: ArrowUpRight,
          note: "Across the selected period",
          tone: "orange",
        },
        {
          title: "Net profit",
          value: money(data.totals.profit),
          icon: TrendingUp,
          note: `${data.totals.revenue ? ((data.totals.profit / data.totals.revenue) * 100).toFixed(1) : "0"}% profit margin`,
          tone: "green",
        },
        {
          title: "Team members",
          value: number(data.totals.employees),
          icon: Users,
          note: "Headcount in the latest month",
          tone: "blue",
        },
      ]
    : [];
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#overview" aria-label="Meridian overview">
          <span className="brand-icon">
            <ChartNoAxesCombined size={22} />
          </span>
          meridian<span className="brand-period">.</span>
        </a>
        <nav aria-label="Main navigation">
          {[
            ["overview", "Overview"],
            ["financials", "Financials"],
            ["departments", "Departments"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => setActive(id)}
              className={active === id ? "active" : ""}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="account-actions"><div className="company"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><div>{user.name}<span>Company workspace</span></div></div><Logout onSignedOut={onSignedOut}/></div>
      </header>
      <main id="overview">
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR BUSINESS, AT A GLANCE</p>
            <h1>
              Company overview<span>.</span>
            </h1>
            <p className="intro">
              A clearer picture of how your company is performing.
            </p>
          </div>
          <button
            className="button export"
            disabled={!data || loading || !!error}
            onClick={() => exportCsv(data)}
          >
            <ArrowDownToLine size={16} />
            Export report
          </button>
        </div>
        <div className="filter-row">
          <div className="filter-group">
            <label className="filter">
              <CalendarDays size={16} />
              <span className="sr-only">Reporting period</span>
              <select
                value={months}
                onChange={(e) => setMonths(e.target.value)}
              >
                <option value="12">Last 12 months</option>
                <option value="6">Last 6 months</option>
                <option value="3">Last 3 months</option>
              </select>
            </label>
            <label className="filter">
              <span className="sr-only">Department</span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="all">All departments</option>
                {["Sales", "Engineering", "Marketing", "Operations"].map(
                  (name) => (
                    <option key={name}>{name}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="status">
            <span className="status-dot" />
            {data?.source === "postgresql" ? "PostgreSQL data" : "Sample data"}
            <button
              className="refresh"
              aria-label="Refresh statistics"
              disabled={loading}
              onClick={() => setRefresh((v) => v + 1)}
            >
              <RefreshCw size={15} className={loading ? "spinning" : ""} />
            </button>
          </div>
        </div>
        {loading && (
          <div className="notice" role="status">
            Loading company statistics…
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button className="button" onClick={() => setRefresh((v) => v + 1)}>
              Try again
            </button>
          </div>
        )}
        {!loading &&
          !error &&
          data &&
          (data.monthly.length === 0 ? (
            <div className="notice">
              No statistics yet. Add company data to see your dashboard.
            </div>
          ) : (
            <>
              <div className="period-caption">
                Reporting period: {data.period.start} — {data.period.end}
                {data.source === "demo" && " · Illustrative figures for 2026"}
              </div>
              <div className="metrics">
                {cards.map(({ title, value, icon: Icon, note, tone }) => (
                  <article className="metric" key={title}>
                    <div className="metric-heading">
                      <p>{title}</p>
                      <span className={`metric-icon ${tone}`}>
                        <Icon size={18} />
                      </span>
                    </div>
                    <strong>{value}</strong>
                    <span className="metric-note">{note}</span>
                  </article>
                ))}
              </div>
              <div className="chart-grid">
                <Panel
                  id="financials"
                  title="Revenue & expenses"
                  subtitle="Track your financial performance over time"
                  className="trend"
                >
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.monthly}
                        margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="revenueFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#6c5ce7"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#6c5ce7"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 5"
                          vertical={false}
                          stroke="#eaeaf2"
                        />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#8b8c9b", fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          tickFormatter={compact}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#8b8c9b", fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={money}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #eee",
                          }}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ paddingTop: 24, fontSize: 12 }}
                        />
                        <Area
                          name="Revenue"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#6c5ce7"
                          fill="url(#revenueFill)"
                          strokeWidth={3}
                        />
                        <Area
                          name="Expenses"
                          type="monotone"
                          dataKey="expenses"
                          stroke="#b5afcc"
                          fill="transparent"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel
                  id="departments"
                  title="Revenue by department"
                  subtitle="Where your revenue comes from"
                >
                  <div className="donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.breakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={4}
                          stroke="none"
                        >
                          {data.breakdown.map((item, i) => (
                            <Cell key={item.name} fill={colors[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={money} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                      <span>Revenue</span>
                      <strong>{compact(data.totals.revenue)}</strong>
                    </div>
                  </div>
                  <ul className="department-legend">
                    {data.breakdown.map((item, i) => (
                      <li key={item.name}>
                        <span>
                          <i style={{ background: colors[i] }} />
                          {item.name}
                        </span>
                        <strong>
                          {Math.round((item.value / data.totals.revenue) * 100)}
                          %
                        </strong>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel
                  title="Monthly sales"
                  subtitle="Sales volume across the reporting period"
                  className="sales"
                >
                  <div className="chart sales-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.monthly}
                        margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 5"
                          vertical={false}
                          stroke="#eaeaf2"
                        />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#8b8c9b", fontSize: 12 }}
                          dy={8}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#8b8c9b", fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={number}
                          cursor={{ fill: "#f5f3ff" }}
                        />
                        <Bar
                          name="Sales"
                          dataKey="sales"
                          fill="#8c7cf0"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={38}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel
                  title="Behind the numbers"
                  subtitle="A quick view of your reporting data"
                  className="insight"
                >
                  <span className="insight-icon">
                    <TrendingUp size={26} />
                  </span>
                  <h3>
                    {number(data.monthly.reduce((sum, r) => sum + r.sales, 0))}{" "}
                    sales this period
                  </h3>
                  <p>
                    Explore your company’s performance by changing the reporting
                    period or selecting a department above.
                  </p>
                  <a href="#financials" onClick={() => setActive("financials")}>
                    Explore financials <ArrowUpRight size={16} />
                  </a>
                </Panel>
              </div>
              <details className="data-table">
                <summary>View chart data as a table</summary>
                <div className="table-scroll">
                  <table>
                    <caption>
                      Monthly statistics for the selected department and period
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Month</th>
                        <th scope="col">Revenue</th>
                        <th scope="col">Expenses</th>
                        <th scope="col">Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly.map((r) => (
                        <tr key={r.month}>
                          <th scope="row">{r.month}</th>
                          <td>{money(r.revenue)}</td>
                          <td>{money(r.expenses)}</td>
                          <td>{number(r.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ))}
        <footer>
          <span>Meridian · Company statistics</span>
          <span>
            {data && !error
              ? `Fetched at ${new Date(data.updatedAt).toLocaleTimeString("en-GB")}`
              : "Company dashboard"}
          </span>
        </footer>
      </main>
    </>
  );
}
function Logout({ onSignedOut }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <div className="logout-control"><button className="button" disabled={pending} onClick={async () => {
    setPending(true); setError("");
    try { await fetchStatistics("/api/auth/logout", { method: "POST", body: {} }); onSignedOut(); }
    catch (err) { setError(err.message); }
    finally { setPending(false); }
  }}>{pending ? "Logging out…" : "Log out"}</button>{error && <span role="alert">{error}</span>}</div>;
}
function App() {
  return <AuthGate>{(user, onSignedOut) => <Dashboard user={user} onSignedOut={onSignedOut}/>}</AuthGate>;
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
