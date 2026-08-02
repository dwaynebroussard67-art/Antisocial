"use client";

import { useEffect, useState } from "react";

type Site = "antisocial" | "misfit";

interface NuraAction {
  id: number;
  site: Site;
  targetType: string;
  targetId: number;
  action: string;
  active: boolean;
  reversedBy: number | null;
  reversedAt: string | null;
  reason: string;
  createdAt: string;
}

interface NuraLogRow {
  id: number;
  site: Site;
  messageId: number | null;
  memberId: number | null;
  stage: string;
  flag: string;
  llmClass: string | null;
  action: string;
  decidedBy: string;
  reason: string;
  createdAt: string;
}

interface ConfigRow {
  id: number;
  site: Site;
  key: string;
  value: unknown;
  updatedAt: string;
}

interface Alert {
  id: number;
  site: Site;
  memberId: number | null;
  memberHandle: string | null;
  reason: string;
  status: string;
  answeredBy: number | null;
  createdAt: string;
}

const SITES: Site[] = ["antisocial", "misfit"];

export default function AdminNuraClient() {
  const [quiet, setQuiet] = useState<Record<Site, boolean>>({ antisocial: true, misfit: true });
  const [actions, setActions] = useState<NuraAction[]>([]);
  const [log, setLog] = useState<NuraLogRow[]>([]);
  const [config, setConfig] = useState<ConfigRow[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logSiteFilter, setLogSiteFilter] = useState<string>("");
  const [logFlagFilter, setLogFlagFilter] = useState<string>("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  async function refreshAll() {
    const [aRes, lRes, cRes, alRes, q1, q2] = await Promise.all([
      fetch("/api/admin/nura/actions").then((r) => r.json()),
      fetch(
        `/api/admin/nura/log${logSiteFilter || logFlagFilter ? "?" : ""}${logSiteFilter ? `site=${logSiteFilter}&` : ""}${logFlagFilter ? `flag=${logFlagFilter}` : ""}`,
      ).then((r) => r.json()),
      fetch("/api/admin/nura/config").then((r) => r.json()),
      fetch("/api/admin/nura/alerts").then((r) => r.json()),
      fetch("/api/admin/nura/quiet-mode?site=antisocial").then((r) => r.json()),
      fetch("/api/admin/nura/quiet-mode?site=misfit").then((r) => r.json()),
    ]);
    setActions(aRes.actions ?? []);
    setLog(lRes.log ?? []);
    setConfig(cRes.config ?? []);
    setAlerts(alRes.alerts ?? []);
    setQuiet({ antisocial: q1.quiet?.enabled ?? true, misfit: q2.quiet?.enabled ?? true });
  }

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logSiteFilter, logFlagFilter]);

  async function toggleQuiet(site: Site) {
    const next = !quiet[site];
    await fetch("/api/admin/nura/quiet-mode", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ site, enabled: next }),
    });
    setQuiet((q) => ({ ...q, [site]: next }));
  }

  async function reverse(actionId: number) {
    await fetch("/api/admin/nura/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actionId, reversedByMemberId: 1 }),
    });
    refreshAll();
  }

  async function answerAlert(alertId: number) {
    await fetch("/api/admin/nura/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alertId, responderMemberId: 6 }),
    });
    refreshAll();
  }

  function startEdit(row: ConfigRow) {
    setEditingKey(`${row.site}:${row.key}`);
    setEditingValue(JSON.stringify(row.value, null, 2));
  }

  async function saveEdit(site: Site, key: string) {
    try {
      const value = JSON.parse(editingValue);
      await fetch("/api/admin/nura/config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ site, key, value }),
      });
      setEditingKey(null);
      refreshAll();
    } catch {
      alert("Invalid JSON — not saved.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Guardian Admin</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Human oversight: what Nura would do, what she did, and one-tap reversal. Nothing here is
          permanent.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-lg font-semibold">Quiet mode</h2>
        <p className="mt-1 text-sm text-neutral-400">
          While enabled, Nura logs every flag and the action she would have taken — but takes no
          real action. Watch before you let her act.
        </p>
        <div className="mt-3 flex gap-4">
          {SITES.map((site) => (
            <label key={site} className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2 text-sm">
              <input type="checkbox" checked={quiet[site]} onChange={() => toggleQuiet(site)} />
              <span className="capitalize">{site}</span>
              <span className={quiet[site] ? "text-orange-300" : "text-emerald-400"}>
                {quiet[site] ? "quiet (logging only)" : "live (acting)"}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-lg font-semibold">Crisis / responder ledger</h2>
        <div className="mt-3 space-y-2">
          {alerts.length === 0 && <p className="text-sm text-neutral-500">No alerts yet.</p>}
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-neutral-800 p-3 text-sm">
              <div>
                <p>
                  <span className="capitalize text-orange-300">{a.site}</span> · {a.reason}
                </p>
                <p className="text-xs text-neutral-500">
                  {a.memberHandle ? `@${a.memberHandle}` : "unknown"} · {new Date(a.createdAt).toLocaleString()} · status: {a.status}
                </p>
              </div>
              {a.status === "open" && (
                <button
                  onClick={() => answerAlert(a.id)}
                  className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                >
                  Answer (verified call)
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-lg font-semibold">Action queue (reversible)</h2>
        <div className="mt-3 space-y-2">
          {actions.length === 0 && <p className="text-sm text-neutral-500">Nothing to review.</p>}
          {actions.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-neutral-800 p-3 text-sm">
              <div>
                <p>
                  <span className="capitalize text-orange-300">{a.site}</span> · {a.action} on{" "}
                  {a.targetType} #{a.targetId} {a.active ? "" : "(reversed)"}
                </p>
                <p className="text-xs text-neutral-500">{a.reason}</p>
                <p className="text-xs text-neutral-600">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
              {a.active && (
                <button
                  onClick={() => reverse(a.id)}
                  className="rounded-md bg-neutral-700 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-600"
                >
                  Reverse
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Append-only log</h2>
          <div className="flex gap-2 text-xs">
            <select
              className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
              value={logSiteFilter}
              onChange={(e) => setLogSiteFilter(e.target.value)}
            >
              <option value="">all sites</option>
              <option value="antisocial">antisocial</option>
              <option value="misfit">misfit</option>
            </select>
            <select
              className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1"
              value={logFlagFilter}
              onChange={(e) => setLogFlagFilter(e.target.value)}
            >
              <option value="">all flags</option>
              <option value="none">none</option>
              <option value="harm_candidate">harm_candidate</option>
              <option value="confirmed_harm">confirmed_harm</option>
              <option value="crisis">crisis</option>
              <option value="predation">predation</option>
            </select>
          </div>
        </div>
        <div className="mt-3 max-h-96 overflow-y-auto text-xs">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-neutral-900 text-neutral-500">
              <tr>
                <th className="py-1 pr-2">time</th>
                <th className="py-1 pr-2">site</th>
                <th className="py-1 pr-2">stage</th>
                <th className="py-1 pr-2">flag</th>
                <th className="py-1 pr-2">llm</th>
                <th className="py-1 pr-2">action</th>
                <th className="py-1 pr-2">by</th>
                <th className="py-1 pr-2">reason</th>
              </tr>
            </thead>
            <tbody>
              {log.map((row) => (
                <tr key={row.id} className="border-t border-neutral-800/70">
                  <td className="py-1 pr-2 text-neutral-500">{new Date(row.createdAt).toLocaleTimeString()}</td>
                  <td className="py-1 pr-2">{row.site}</td>
                  <td className="py-1 pr-2">{row.stage}</td>
                  <td className="py-1 pr-2">{row.flag}</td>
                  <td className="py-1 pr-2">{row.llmClass ?? "—"}</td>
                  <td className="py-1 pr-2">{row.action}</td>
                  <td className="py-1 pr-2">{row.decidedBy}</td>
                  <td className="py-1 pr-2 text-neutral-400">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {log.length === 0 && <p className="py-3 text-neutral-500">No log entries yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-lg font-semibold">Config (packs, thresholds, copy)</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Edited without a redeploy. Raw JSON — save applies immediately to the running pipeline.
        </p>
        <div className="mt-3 space-y-3">
          {SITES.map((site) => (
            <div key={site}>
              <h3 className="text-sm font-semibold capitalize text-orange-300">{site}</h3>
              {config
                .filter((c) => c.site === site)
                .map((row) => {
                  const editKey = `${row.site}:${row.key}`;
                  const isEditing = editingKey === editKey;
                  return (
                    <div key={row.id} className="mt-2 rounded-lg border border-neutral-800 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-neutral-300">{row.key}</p>
                        {!isEditing ? (
                          <button
                            onClick={() => startEdit(row)}
                            className="rounded bg-neutral-700 px-2 py-1 text-[11px] hover:bg-neutral-600"
                          >
                            edit
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(row.site, row.key)}
                              className="rounded bg-orange-700 px-2 py-1 text-[11px] hover:bg-orange-600"
                            >
                              save
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="rounded bg-neutral-700 px-2 py-1 text-[11px] hover:bg-neutral-600"
                            >
                              cancel
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea
                          className="mt-2 h-40 w-full rounded-md border border-neutral-700 bg-neutral-950 p-2 font-mono text-[11px] text-neutral-100"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                        />
                      ) : (
                        <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-neutral-500">
                          {JSON.stringify(row.value, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
