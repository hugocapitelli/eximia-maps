"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Input, Badge, Tabs } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Key,
  Link2,
  ScrollText,
  Plus,
  Copy,
  CheckCircle2,
  Trash2,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ApiKey {
  id: string;
  app_name: string;
  key_prefix: string;
  scopes: string[];
  status: "active" | "revoked";
  last_used: string | null;
  expires_at: string | null;
  created_at: string;
  key?: string;
}

interface Connection {
  id: string;
  remote_app: string;
  remote_url: string;
  status: "active" | "error" | "pending" | "disabled";
  entities: string[];
  catalog_cache: Record<string, unknown> | null;
  last_sync: string | null;
  last_error: string | null;
  created_at: string;
}

interface LogEntry {
  id: string;
  direction: "inbound" | "outbound";
  method: string;
  endpoint: string;
  entity: string | null;
  status_code: number;
  duration_ms: number;
  remote_app: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export default function IntegrationsSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Integrações</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Gerencie API keys, conexões com outros apps eximIA e monitore chamadas
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "keys", label: "API Keys", icon: <Key size={14} /> },
          { id: "connections", label: "Conexões", icon: <Link2 size={14} /> },
          { id: "logs", label: "Logs", icon: <ScrollText size={14} /> },
        ]}
      >
        {(tab) => (
          <>
            {tab === "keys" && <KeysTab />}
            {tab === "connections" && <ConnectionsTab />}
            {tab === "logs" && <LogsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 1: API Keys (Inbound)
// ═══════════════════════════════════════════════════════════════

function KeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const toast = useToast();

  const [appName, setAppName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);

  const loadKeys = useCallback(async () => {
    const res = await fetch("/api/integrations/keys");
    if (res.ok) setKeys(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function handleCreate() {
    if (!appName.trim()) return;
    setCreating(true);

    const res = await fetch("/api/integrations/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_name: appName.trim(), scopes }),
    });

    if (res.ok) {
      const data = await res.json();
      setNewKey(data);
      setShowForm(false);
      setAppName("");
      setScopes(["read"]);
      loadKeys();
      toast.success("API key criada!");
    } else {
      toast.error("Erro ao criar key");
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/integrations/keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadKeys();
      toast.success("Key revogada");
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2500);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3">
        <Shield size={16} className="text-[#82B4C4] shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-400">
          <strong className="text-white">Inbound:</strong> Outros apps eximIA usam estas keys para acessar
          seus mapas mentais. A key completa só é exibida uma vez — no momento da criação.
        </div>
      </div>

      {newKey?.key && (
        <div className="rounded-xl border-2 border-[#82B4C4]/50 bg-[#82B4C4]/5 p-4 space-y-2">
          <p className="text-xs font-semibold text-[#82B4C4]">Key criada — copie agora (não será exibida novamente)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-neutral-950 px-3 py-2 text-xs font-mono text-white break-all">
              {newKey.key}
            </code>
            <button
              onClick={() => handleCopy(newKey.key!, "new-key")}
              className="shrink-0 rounded-lg border border-neutral-700 p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              {copiedId === "new-key" ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-[11px] text-neutral-500 hover:text-white transition-colors">
            Entendido, já copiei
          </button>
        </div>
      )}

      {showForm ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Nova API Key</h3>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Nome do app</label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="ex: eximia-academy, meu-crm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Permissões</label>
            <div className="flex gap-3">
              {["read", "write", "admin"].map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={scopes.includes(s)}
                    onChange={(e) =>
                      setScopes(e.target.checked ? [...scopes, s] : scopes.filter((x) => x !== s))
                    }
                    className="rounded border-neutral-600"
                  />
                  <span className="capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating || !appName.trim()} className="gap-1.5">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
              Criar key
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus size={14} />
          Nova API Key
        </Button>
      )}

      {keys.length === 0 ? (
        <EmptyState icon={<Key size={24} />} text="Nenhuma API key criada" />
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{k.app_name}</span>
                  <StatusDot status={k.status === "active" ? "active" : "disabled"} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <code className="text-[11px] font-mono text-neutral-500">{k.key_prefix}...</code>
                  <ScopeBadges scopes={k.scopes} />
                  {k.last_used && (
                    <span className="text-[11px] text-neutral-600">
                      Último uso: {new Date(k.last_used).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleCopy(k.key_prefix, k.id)}
                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-white transition-colors"
                >
                  {copiedId === k.id ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
                {k.status === "active" && (
                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 2: Connections (Outbound)
// ═══════════════════════════════════════════════════════════════

function ConnectionsTab() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const toast = useToast();

  const [remoteApp, setRemoteApp] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const loadConnections = useCallback(async () => {
    const res = await fetch("/api/integrations/connections");
    if (res.ok) setConnections(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  async function handleCreate() {
    if (!remoteApp.trim() || !remoteUrl.trim() || !apiKey.trim()) return;
    setCreating(true);

    const res = await fetch("/api/integrations/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remote_app: remoteApp.trim(),
        remote_url: remoteUrl.trim(),
        api_key: apiKey.trim(),
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setRemoteApp("");
      setRemoteUrl("");
      setApiKey("");
      loadConnections();
      toast.success("Conexão criada!");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erro ao criar conexão");
    }
    setCreating(false);
  }

  async function handleTest(id: string) {
    setTestingId(id);
    const res = await fetch(`/api/integrations/connections/${id}`, { method: "POST" });
    if (res.ok) {
      toast.success("Conexão ativa!");
    } else {
      toast.error("Falha na conexão");
    }
    loadConnections();
    setTestingId(null);
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/integrations/connections/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadConnections();
      toast.success("Conexão removida");
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3">
        <Zap size={16} className="text-[#82B4C4] shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-400">
          <strong className="text-white">Outbound:</strong> Conecte-se a outros apps eximIA para acessar
          seus dados. Você precisa de uma API key do app remoto.
        </div>
      </div>

      {showForm ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Nova Conexão</h3>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Nome do app remoto</label>
            <Input value={remoteApp} onChange={(e) => setRemoteApp(e.target.value)} placeholder="ex: eximia-forms" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">URL base</label>
            <Input value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="https://forms.eximiaventures.com.br" type="url" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">API Key do app remoto</label>
            <div className="relative">
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="eximia_forms_..."
                type={showApiKey ? "text" : "password"}
                className="pr-10"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating || !remoteApp.trim() || !remoteUrl.trim() || !apiKey.trim()} className="gap-1.5">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
              Conectar
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus size={14} />
          Nova Conexão
        </Button>
      )}

      {connections.length === 0 ? (
        <EmptyState icon={<Link2 size={24} />} text="Nenhuma conexão configurada" />
      ) : (
        <div className="space-y-2">
          {connections.map((c) => (
            <div key={c.id} className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{c.remote_app}</span>
                    <StatusDot status={c.status} />
                  </div>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">{c.remote_url}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleTest(c.id)}
                    disabled={testingId === c.id}
                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-white transition-colors"
                  >
                    {testingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  </button>
                  <button
                    onClick={() => handleRemove(c.id)}
                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {(c.entities.length > 0 || c.last_sync || c.last_error) && (
                <div className="border-t border-neutral-800/50 bg-neutral-950/30 px-4 py-2.5 flex flex-wrap items-center gap-2">
                  {c.entities.map((e) => (
                    <span key={e} className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
                      {e}
                    </span>
                  ))}
                  {c.last_sync && (
                    <span className="text-[10px] text-neutral-600 ml-auto">
                      Sync: {new Date(c.last_sync).toLocaleString("pt-BR")}
                    </span>
                  )}
                  {c.last_error && (
                    <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={c.last_error}>
                      {c.last_error}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 3: Logs
// ═══════════════════════════════════════════════════════════════

function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/integrations/logs")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setLogs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  if (logs.length === 0) {
    return <EmptyState icon={<ScrollText size={24} />} text="Nenhuma chamada registrada" />;
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[28px_60px_56px_1fr_60px_60px_100px] gap-2 px-3 py-2 text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">
        <span></span>
        <span>Method</span>
        <span>Status</span>
        <span>Endpoint</span>
        <span>Dur.</span>
        <span>App</span>
        <span>Data</span>
      </div>

      {logs.map((log) => (
        <div
          key={log.id}
          className="grid grid-cols-[28px_60px_56px_1fr_60px_60px_100px] gap-2 items-center rounded-lg border border-neutral-800/30 bg-neutral-900 px-3 py-2 text-xs"
        >
          <span className={log.direction === "inbound" ? "text-blue-400" : "text-[#82B4C4]"}>
            {log.direction === "inbound" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
          </span>
          <MethodBadge method={log.method} />
          <span className={
            log.status_code >= 200 && log.status_code < 300 ? "text-green-400 font-mono" :
            log.status_code >= 400 ? "text-red-400 font-mono" : "text-yellow-400 font-mono"
          }>
            {log.status_code}
          </span>
          <span className="font-mono text-neutral-500 truncate" title={log.endpoint}>
            {log.endpoint}
          </span>
          <span className="text-neutral-600 font-mono">{log.duration_ms}ms</span>
          <span className="text-neutral-500 truncate" title={log.remote_app || undefined}>
            {log.remote_app || "—"}
          </span>
          <span className="text-neutral-600 text-[10px]">
            {new Date(log.created_at).toLocaleString("pt-BR", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-neutral-600">
      {icon}
      <p className="mt-2 text-sm">{text}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500",
    pending: "bg-yellow-500",
    error: "bg-red-500",
    disabled: "bg-neutral-500",
    revoked: "bg-neutral-500",
  };
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[status] || colors.disabled}`} title={status} />
  );
}

function ScopeBadges({ scopes }: { scopes: string[] }) {
  return (
    <div className="flex gap-1">
      {scopes.map((s) => (
        <Badge key={s} variant={s === "admin" ? "danger" : s === "write" ? "warning" : "default"} className="text-[9px] px-1.5 py-0">
          {s}
        </Badge>
      ))}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-400",
    POST: "bg-[#82B4C4]/10 text-[#82B4C4]",
    PUT: "bg-yellow-500/10 text-yellow-400",
    DELETE: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono ${colors[method] || "bg-neutral-800 text-neutral-400"}`}>
      {method}
    </span>
  );
}
