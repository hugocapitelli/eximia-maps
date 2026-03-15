"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { authFetch } from "@/lib/gate";
import { Send, Loader2, Bot, User } from "lucide-react";
import { useMapStore } from "@/stores/map-store";
import { cn } from "@/lib/utils/cn";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, setMap, title } = useMapStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Build context from current map
      const mapContext = nodes
        .map((n) => `- ${n.data.label} (level ${n.data.level})`)
        .join("\n");

      const response = await authFetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Mapa mental atual "${title}":\n${mapContext}\n\nPedido do usuario: ${userMessage}\n\nGere o mapa mental atualizado incorporando o pedido.`,
          style: "default",
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      setMap(data.title, data.nodes, data.edges);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Mapa atualizado com ${data.nodes.length} nodes. ${userMessage.includes("adicion") ? "Nodes adicionados." : "Mapa regenerado."}`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao processar. Tente novamente." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, nodes, edges, title, setMap]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (nodes.length === 0) return null;

  return (
    <div className="glass-panel flex flex-col animate-slide-in" style={{ maxHeight: "400px" }}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
        {messages.length === 0 && (
          <div className="text-xs text-muted text-center py-4">
            Converse com a IA para refinar seu mapa.
            <br />
            Ex: &quot;Adicione mais detalhes em X&quot; ou &quot;Reorganize os branches&quot;
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 text-xs",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-5 h-5 rounded-full bg-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={12} className="text-teal" />
              </div>
            )}
            <div
              className={cn(
                "px-3 py-2 rounded-lg max-w-[85%]",
                msg.role === "user"
                  ? "bg-teal/15 text-primary"
                  : "bg-elevated text-cream-dim"
              )}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                <User size={12} className="text-accent" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-teal">
            <Loader2 size={12} className="animate-spin" />
            Processando...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Refine seu mapa..."
            className="flex-1 bg-bg/50 border border-border rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-teal/50 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-teal/20 text-teal hover:bg-teal/30 disabled:opacity-30 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
