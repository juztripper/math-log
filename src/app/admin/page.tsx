"use client";

import { useState, useEffect, useCallback } from "react";

interface NameCount {
  name: string;
  count: number;
}

interface DashboardData {
  totalPageViews: number;
  uniqueVisitors: number;
  todayPageViews: number;
  todayUniqueVisitors: number;
  viewsByDay: { date: string; count: number; unique: number }[];
  topPages: NameCount[];
  browsers: NameCount[];
  os: NameCount[];
  devices: NameCount[];
  countries: NameCount[];
  cities: NameCount[];
  lastSync: string | null;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

function deviceLabel(d: string) {
  if (d === "desktop") return "Computador";
  if (d === "mobile") return "Telemóvel";
  if (d === "tablet") return "Tablet";
  return d;
}

function BarList({ items, max }: { items: NameCount[]; max: number }) {
  if (items.length === 0) return <p className="admin-empty">Sem dados</p>;
  return (
    <div className="admin-bar-list">
      {items.map(({ name, count }) => (
        <div key={name} className="admin-bar-row">
          <div className="admin-bar-label">{name}</div>
          <div className="admin-bar-track">
            <div
              className="admin-bar-fill"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <div className="admin-bar-value">{count}</div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [chartMode, setChartMode] = useState<"views" | "unique">("views");

  const fetchData = useCallback(
    async (t: string, d: number) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/analytics/data?days=${d}`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.status === 401) {
          setAuthed(false);
          setError("Token inválido");
          sessionStorage.removeItem("admin-token");
          return;
        }
        setData(await res.json());
        setAuthed(true);
      } catch {
        setError("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const saved = sessionStorage.getItem("admin-token");
    if (saved) {
      setToken(saved);
      fetchData(saved, days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("admin-token", token);
    await fetchData(token, days);
  };

  const changeDays = (n: number) => {
    setDays(n);
    fetchData(token, n);
  };

  const sync = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setSyncMsg(
          `Sincronizado: ${json.pages?.["10"] ?? "?"} págs (10.º) + ${json.pages?.["11"] ?? "?"} págs (11.º)`
        );
        await fetchData(token, days);
      } else {
        setSyncMsg(`Erro: ${json.error || "Falha"}`);
      }
    } catch {
      setSyncMsg("Erro de ligação");
    } finally {
      setSyncing(false);
    }
  };

  /* ── Login ─────────────────────────────────── */
  if (!authed) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <div className="admin-login-logo">
            <span className="admin-login-mark" />
            <span className="admin-login-title">math.log</span>
          </div>
          <p className="admin-login-sub">Painel de Administração</p>
          <form onSubmit={login} className="admin-login-form">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token de acesso"
              autoFocus
              className="admin-input"
            />
            <button
              type="submit"
              disabled={!token || loading}
              className="admin-btn admin-btn-primary"
            >
              {loading ? "A verificar..." : "Entrar"}
            </button>
          </form>
          {error && <p className="admin-error">{error}</p>}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartValues = data.viewsByDay.map((d) =>
    chartMode === "views" ? d.count : d.unique
  );
  const maxDay = Math.max(...chartValues, 1);

  /* ── Dashboard ─────────────────────────────── */
  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <a href="/" className="admin-logo-link">
            math.log
          </a>
          <span className="admin-badge">Admin</span>
        </div>
        <div className="admin-header-right">
          <select
            value={days}
            onChange={(e) => changeDays(Number(e.target.value))}
            className="admin-select"
          >
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
          <button
            onClick={() => fetchData(token, days)}
            disabled={loading}
            className="admin-btn admin-btn-secondary"
          >
            Atualizar
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem("admin-token");
              setAuthed(false);
            }}
            className="admin-btn admin-btn-ghost"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="admin-content">
        {/* ── Sync Panel ──────────────────────── */}
        <section className="admin-panel admin-sync-panel">
          <h2 className="admin-panel-title">Sincronização de Dados</h2>
          <div className="admin-sync-grid">
            <div className="admin-sync-item">
              <span className="admin-sync-label">Última atualização (cache)</span>
              <span className="admin-sync-value">
                {data.lastSync ? formatDateTime(data.lastSync) : "Nunca"}
              </span>
            </div>
            <div className="admin-sync-item">
              <span className="admin-sync-label">Último fetch do Notion</span>
              <span className="admin-sync-value">
                {data.lastSync ? formatDateTime(data.lastSync) : "Nunca"}
              </span>
            </div>
            <div className="admin-sync-item admin-sync-action">
              <button
                onClick={sync}
                disabled={syncing}
                className="admin-btn admin-btn-sync"
              >
                {syncing ? "A sincronizar..." : "Sincronizar agora"}
              </button>
              {syncMsg && (
                <p
                  className={
                    syncMsg.startsWith("Erro")
                      ? "admin-error"
                      : "admin-success"
                  }
                >
                  {syncMsg}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Overview Cards ─────────────────── */}
        <div className="admin-cards">
          <div className="admin-card">
            <span className="admin-card-number">{data.totalPageViews}</span>
            <span className="admin-card-label">
              Visualizações ({days}d)
            </span>
          </div>
          <div className="admin-card">
            <span className="admin-card-number">{data.uniqueVisitors}</span>
            <span className="admin-card-label">
              Visitantes únicos ({days}d)
            </span>
          </div>
          <div className="admin-card">
            <span className="admin-card-number">{data.todayPageViews}</span>
            <span className="admin-card-label">Visualizações hoje</span>
          </div>
          <div className="admin-card">
            <span className="admin-card-number">
              {data.todayUniqueVisitors}
            </span>
            <span className="admin-card-label">Visitantes hoje</span>
          </div>
        </div>

        {/* ── Chart ──────────────────────────── */}
        <section className="admin-panel">
          <div className="admin-chart-header">
            <h2 className="admin-panel-title">
              {chartMode === "views" ? "Visualizações" : "Visitantes Únicos"} por Dia
            </h2>
            <div className="admin-toggle">
              <button
                className={`admin-toggle-btn ${chartMode === "views" ? "active" : ""}`}
                onClick={() => setChartMode("views")}
              >
                Visualizações
              </button>
              <button
                className={`admin-toggle-btn ${chartMode === "unique" ? "active" : ""}`}
                onClick={() => setChartMode("unique")}
              >
                Únicos
              </button>
            </div>
          </div>
          <div className="admin-chart">
            {data.viewsByDay.map((day, i) => {
              const val = chartValues[i];
              return (
                <div key={day.date} className="admin-chart-col">
                  <span className="admin-chart-count">
                    {val > 0 ? val : ""}
                  </span>
                  <div className="admin-chart-bar-wrap">
                    <div
                      className="admin-chart-bar"
                      style={{ height: `${(val / maxDay) * 100}%` }}
                    />
                  </div>
                  <span className="admin-chart-date">
                    {formatShortDate(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Tables Grid ────────────────────── */}
        <div className="admin-grid">
          <section className="admin-panel">
            <h2 className="admin-panel-title">Páginas Mais Visitadas</h2>
            <BarList
              items={data.topPages}
              max={data.topPages[0]?.count || 1}
            />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Navegadores</h2>
            <BarList
              items={data.browsers}
              max={data.browsers[0]?.count || 1}
            />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Sistemas Operativos</h2>
            <BarList items={data.os} max={data.os[0]?.count || 1} />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Dispositivos</h2>
            <BarList
              items={data.devices.map((d) => ({
                name: deviceLabel(d.name),
                count: d.count,
              }))}
              max={data.devices[0]?.count || 1}
            />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Países</h2>
            <BarList
              items={data.countries}
              max={data.countries[0]?.count || 1}
            />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Cidades</h2>
            <BarList items={data.cities} max={data.cities[0]?.count || 1} />
          </section>
        </div>
      </div>
    </div>
  );
}
