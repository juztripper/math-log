"use client";

import { useState, useEffect, useCallback } from "react";

interface PageEntry {
  name: string;
  count: number;
  unique: number;
  avgTime: string;
  avgTimePerUser: string;
}

interface NameCount {
  name: string;
  count: number;
  unique: number;
}

interface DashboardData {
  totalPageViews: number;
  uniqueVisitors: number;
  todayPageViews: number;
  todayUniqueVisitors: number;
  avgTimeOnPage: string;
  avgSessionTime: string;
  viewsByDay: { date: string; count: number; unique: number }[];
  topPages: PageEntry[];
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

function BarList({
  items,
  mode,
}: {
  items: NameCount[];
  mode: "views" | "unique";
}) {
  if (items.length === 0) return <p className="admin-empty">Sem dados</p>;
  const sorted =
    mode === "unique"
      ? [...items].sort((a, b) => b.unique - a.unique)
      : items;
  const max = Math.max(sorted[0]?.[mode === "unique" ? "unique" : "count"] ?? 1, 1);
  return (
    <div className="admin-bar-list">
      {sorted.map(({ name, count, unique }) => {
        const val = mode === "unique" ? unique : count;
        return (
          <div key={name} className="admin-bar-row">
            <div className="admin-bar-label">{name}</div>
            <div className="admin-bar-track">
              <div
                className="admin-bar-fill"
                style={{ width: `${(val / max) * 100}%` }}
              />
            </div>
            <div className="admin-bar-value">{val}</div>
          </div>
        );
      })}
    </div>
  );
}

function PageTable({
  pages,
  mode,
}: {
  pages: PageEntry[];
  mode: "views" | "unique";
}) {
  if (pages.length === 0) return <p className="admin-empty">Sem dados</p>;
  const sorted =
    mode === "unique"
      ? [...pages].sort((a, b) => b.unique - a.unique)
      : pages;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Página</th>
            <th>{mode === "unique" ? "Únicos" : "Views"}</th>
            <th>Tempo médio</th>
            <th>Tempo/utilizador</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.name}>
              <td className="admin-table-page">{p.name}</td>
              <td>{mode === "unique" ? p.unique : p.count}</td>
              <td>{p.avgTime}</td>
              <td>{p.avgTimePerUser}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [syncPhase, setSyncPhase] = useState("");
  const [syncCurrent, setSyncCurrent] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [syncPageTitle, setSyncPageTitle] = useState("");
  const [syncStartTime, setSyncStartTime] = useState(0);
  const [syncElapsed, setSyncElapsed] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
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

  // Update elapsed time while syncing
  useEffect(() => {
    if (!syncing || !syncStartTime) return;
    const interval = setInterval(() => {
      setSyncElapsed(Math.floor((Date.now() - syncStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [syncing, syncStartTime]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const sync = async () => {
    setSyncing(true);
    setSyncMsg("");
    setSyncPhase("");
    setSyncCurrent(0);
    setSyncTotal(0);
    setSyncPageTitle("");
    setSyncLogs([]);
    const start = Date.now();
    setSyncStartTime(start);
    setSyncElapsed(0);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
      });

      if (res.status === 401) {
        setSyncMsg("Erro: Token inválido");
        setSyncing(false);
        return;
      }
      if (res.status === 429) {
        const json = await res.json();
        setSyncMsg(`Erro: ${json.error}`);
        setSyncing(false);
        return;
      }
      if (!res.ok) {
        setSyncMsg("Erro: Falha no servidor");
        setSyncing(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setSyncMsg("Erro: Sem resposta do servidor");
        setSyncing(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let lastPhase = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));

            if (evt.phase === "listing") {
              setSyncPhase("listing");
              setSyncPageTitle("");
              if (evt.total) setSyncTotal(evt.total);
            } else if (evt.phase === "blocks") {
              if (lastPhase === "listing") {
                setSyncLogs((prev) => [...prev, `Encontradas ${evt.total} páginas`]);
              }
              setSyncPhase("blocks");
              setSyncCurrent(evt.current || 0);
              setSyncTotal(evt.total || 0);
              setSyncPageTitle(evt.pageTitle || "");
            } else if (evt.phase === "images") {
              setSyncPhase("images");
              setSyncPageTitle(evt.pageTitle || "");
              setSyncLogs((prev) => {
                const msg = evt.message;
                if (prev[prev.length - 1] !== msg) return [...prev, msg];
                return prev;
              });
            } else if (evt.phase === "saving") {
              setSyncPhase("saving");
              setSyncPageTitle("");
            } else if (evt.phase === "done") {
              setSyncPhase("done");
              setSyncMsg(evt.message);
              setSyncLogs((prev) => [...prev, evt.message]);
            } else if (evt.phase === "error") {
              setSyncPhase("error");
              setSyncMsg(`Erro: ${evt.message}`);
            }

            lastPhase = evt.phase;
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      await fetchData(token, days);
    } catch {
      setSyncMsg("Erro de ligação");
      setSyncPhase("error");
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

          {!syncing ? (
            <div className="admin-sync-idle">
              <div className="admin-sync-info-row">
                <div className="admin-sync-item">
                  <span className="admin-sync-label">Última sincronização</span>
                  <span className="admin-sync-value">
                    {data.lastSync ? formatDateTime(data.lastSync) : "Nunca"}
                  </span>
                </div>
                <button
                  onClick={sync}
                  className="admin-btn admin-btn-sync"
                >
                  Sincronizar agora
                </button>
              </div>
              {syncMsg && (
                <p
                  className={`admin-sync-result ${
                    syncMsg.startsWith("Erro")
                      ? "admin-error"
                      : "admin-success"
                  }`}
                >
                  {syncMsg}
                </p>
              )}
            </div>
          ) : (
            <div className="admin-sync-progress">
              {/* Phase indicator */}
              <div className="admin-sync-phases">
                {[
                  { key: "listing", label: "Listar páginas" },
                  { key: "blocks", label: "Obter conteúdo" },
                  { key: "saving", label: "Guardar" },
                ].map((step, i) => {
                  const phases = ["listing", "blocks", "images", "saving", "done"];
                  const currentIdx = phases.indexOf(syncPhase);
                  const stepIdx = phases.indexOf(step.key);
                  const isActive = step.key === syncPhase || (step.key === "blocks" && syncPhase === "images");
                  const isDone = currentIdx > stepIdx && !(step.key === "blocks" && syncPhase === "images");
                  return (
                    <div
                      key={step.key}
                      className={`admin-sync-phase-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                    >
                      <div className="admin-sync-phase-dot">
                        {isDone ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <span className="admin-sync-phase-label">{step.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              {syncTotal > 0 && (syncPhase === "blocks" || syncPhase === "images") && (
                <div className="admin-sync-bar-section">
                  <div className="admin-sync-bar-header">
                    <span className="admin-sync-bar-text">
                      {syncPageTitle}
                    </span>
                    <span className="admin-sync-bar-count">
                      {syncCurrent}/{syncTotal}
                    </span>
                  </div>
                  <div className="admin-sync-bar-track">
                    <div
                      className="admin-sync-bar-fill"
                      style={{ width: `${(syncCurrent / syncTotal) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {syncPhase === "listing" && (
                <div className="admin-sync-bar-section">
                  <div className="admin-sync-bar-header">
                    <span className="admin-sync-bar-text">A consultar Notion...</span>
                  </div>
                  <div className="admin-sync-bar-track">
                    <div className="admin-sync-bar-fill admin-sync-bar-indeterminate" />
                  </div>
                </div>
              )}

              {syncPhase === "saving" && (
                <div className="admin-sync-bar-section">
                  <div className="admin-sync-bar-header">
                    <span className="admin-sync-bar-text">A guardar ficheiros...</span>
                  </div>
                  <div className="admin-sync-bar-track">
                    <div className="admin-sync-bar-fill admin-sync-bar-indeterminate" />
                  </div>
                </div>
              )}

              {/* Time + estimate */}
              <div className="admin-sync-time-row">
                <span>Tempo decorrido: {formatElapsed(syncElapsed)}</span>
                {syncCurrent > 1 && syncTotal > 0 && (syncPhase === "blocks" || syncPhase === "images") && (
                  <span>
                    Estimativa restante: {formatElapsed(
                      Math.round(
                        ((syncElapsed / syncCurrent) * (syncTotal - syncCurrent))
                      )
                    )}
                  </span>
                )}
              </div>

              {/* Live log */}
              {syncLogs.length > 0 && (
                <div className="admin-sync-log">
                  {syncLogs.slice(-5).map((log, i) => (
                    <div key={i} className="admin-sync-log-line">{log}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Overview Cards ─────────────────── */}
        <div className="admin-cards admin-cards-6">
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
          <div className="admin-card">
            <span className="admin-card-number admin-card-time">{data.avgTimeOnPage}</span>
            <span className="admin-card-label">Tempo médio/página</span>
          </div>
          <div className="admin-card">
            <span className="admin-card-number admin-card-time">{data.avgSessionTime}</span>
            <span className="admin-card-label">Tempo médio/sessão</span>
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

        {/* ── Pages Table (full width) ─────── */}
        <section className="admin-panel">
          <div className="admin-chart-header">
            <h2 className="admin-panel-title">Páginas Mais Visitadas</h2>
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
          <PageTable pages={data.topPages} mode={chartMode} />
        </section>

        {/* ── Tables Grid ────────────────────── */}
        <div className="admin-grid">
          <section className="admin-panel">
            <h2 className="admin-panel-title">Navegadores</h2>
            <BarList items={data.browsers} mode={chartMode} />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Sistemas Operativos</h2>
            <BarList items={data.os} mode={chartMode} />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Dispositivos</h2>
            <BarList
              items={data.devices.map((d) => ({
                name: deviceLabel(d.name),
                count: d.count,
                unique: d.unique,
              }))}
              mode={chartMode}
            />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Países</h2>
            <BarList items={data.countries} mode={chartMode} />
          </section>

          <section className="admin-panel admin-panel-wide">
            <h2 className="admin-panel-title">Cidades</h2>
            <BarList items={data.cities} mode={chartMode} />
          </section>
        </div>
      </div>
    </div>
  );
}
