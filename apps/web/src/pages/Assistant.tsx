import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Pin, Send } from "lucide-react";
import type { AgentKind, Citation, Conversation } from "@studio-os/shared";
import { api, streamChat } from "@/lib/api";
import { Badge, Button, Card, Select, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";

interface Agent { kind: AgentKind; name: string; description: string }
interface Msg { id: string; role: string; content: string; citations: Citation[] }
interface ConversationDetail { id: string; title: string; agent: AgentKind; messages: Msg[] }

export function AssistantPage() {
  const qc = useQueryClient();
  const [agent, setAgent] = useState<AgentKind>("CHIEF_ENGINEER");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [liveMessages, setLiveMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: () => api.get<Agent[]>("/api/ai/agents") });
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/api/ai/conversations"),
  });
  const { data: active } = useQuery({
    queryKey: ["conversation", activeId],
    queryFn: () => api.get<ConversationDetail>(`/api/ai/conversations/${activeId}`),
    enabled: !!activeId,
  });

  useEffect(() => {
    if (active) setLiveMessages(active.messages);
  }, [active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [liveMessages]);

  async function send() {
    const message = input.trim();
    if (!message || streaming) return;
    setInput("");
    setStreaming(true);

    const userMsg: Msg = { id: `local-${Date.now()}`, role: "user", content: message, citations: [] };
    const assistantMsg: Msg = { id: `assistant-${Date.now()}`, role: "assistant", content: "", citations: [] };
    setLiveMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      await streamChat({ conversationId: activeId ?? undefined, agent, message, useRag: true }, (evt) => {
        setLiveMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (!last) return prev;
          if (evt.type === "meta" && !activeId) setActiveId(evt.conversationId);
          if (evt.type === "citations") last.citations = evt.citations;
          if (evt.type === "token") last.content += evt.value;
          if (evt.type === "error") last.content += `\n\n_Error: ${evt.message}_`;
          return next;
        });
      });
    } finally {
      setStreaming(false);
      qc.invalidateQueries({ queryKey: ["conversations"] });
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation list */}
      <div className="flex w-64 flex-col gap-2">
        <Button
          variant="primary"
          onClick={() => { setActiveId(null); setLiveMessages([]); }}
        >
          New conversation
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations?.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
                activeId === c.id ? "bg-base-700 text-slate-100" : "text-slate-400 hover:bg-base-800",
              )}
            >
              {c.pinned && <Pin className="h-3 w-3 text-accent" />}
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat pane */}
      <Card className="flex flex-1 flex-col p-0">
        <div className="flex items-center gap-3 border-b border-base-700 px-4 py-2.5">
          <Select value={agent} onChange={(e) => setAgent(e.target.value as AgentKind)}>
            {agents?.map((a) => <option key={a.kind} value={a.kind}>{a.name}</option>)}
          </Select>
          <span className="text-xs text-slate-500">
            {agents?.find((a) => a.kind === agent)?.description}
          </span>
          <Badge tone="green">local RAG</Badge>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {liveMessages.length === 0 && (
            <div className="mt-16 text-center text-sm text-slate-600">
              Ask the {agents?.find((a) => a.kind === agent)?.name ?? "assistant"} anything about your studio.
            </div>
          )}
          {liveMessages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
          {streaming && <div className="flex items-center gap-2 text-xs text-slate-500"><Spinner /> thinking locally…</div>}
        </div>

        <div className="border-t border-base-700 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder="Message… (Enter to send, Shift+Enter for newline)"
            />
            <Button variant="primary" onClick={() => void send()} disabled={streaming || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[80%] rounded-lg px-4 py-2.5", isUser ? "bg-base-700" : "bg-base-800")}>
        <div className="prose-studio text-sm text-slate-200">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || "…"}</ReactMarkdown>
        </div>
        {msg.citations.length > 0 && (
          <div className="mt-3 border-t border-base-700 pt-2">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Sources</div>
            <div className="space-y-1">
              {msg.citations.map((c, i) => (
                <div key={c.chunkId ?? i} className="text-xs text-slate-400">
                  <span className="mr-1 font-mono text-accent">[[{i + 1}]]</span>
                  {c.title}: <span className="text-slate-500">{c.snippet.slice(0, 100)}…</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
