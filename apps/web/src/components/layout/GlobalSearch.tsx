import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import type { SearchResponse } from "@studio-os/shared";
import { api } from "@/lib/api";
import { Badge, Spinner } from "@/components/ui";

/** One global search box (keyboard: press "/" to focus). */
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResult(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`);
        setResult(res);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 rounded-md border border-base-600 bg-base-900 px-3 py-1.5">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => result && setOpen(true)}
          placeholder="Search everything — sessions, gear, docs, clients…  ( / )"
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        {loading && <Spinner />}
      </div>
      {open && result && (
        <div
          className="absolute z-30 mt-1 max-h-96 w-full overflow-y-auto rounded-md border border-base-700 bg-base-900 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          {result.hits.length === 0 && <div className="p-3 text-sm text-slate-500">No matches.</div>}
          {result.hits.map((hit) => (
            <button
              key={`${hit.type}-${hit.id}`}
              onClick={() => {
                setOpen(false);
                navigate(hit.url);
              }}
              className="flex w-full items-start gap-3 border-b border-base-800 px-3 py-2 text-left hover:bg-base-800"
            >
              <Badge tone="blue">{hit.type}</Badge>
              <div className="min-w-0">
                <div className="truncate text-sm text-slate-200">{hit.title}</div>
                <div className="truncate text-xs text-slate-500">{hit.snippet}</div>
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-slate-600">
            {result.hits.length} results · {result.mode} · {result.tookMs}ms
          </div>
        </div>
      )}
    </div>
  );
}
