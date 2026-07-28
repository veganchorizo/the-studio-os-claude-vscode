import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";

/**
 * Generic module view. Each of these modules has a fully-typed backend API and
 * plugin extension points; this component renders live data from that API while
 * bespoke UIs are layered on incrementally.
 */
export function Placeholder({ title, resource }: { title: string; resource: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: [resource],
    queryFn: () => api.get<unknown>(resource),
  });

  return (
    <div>
      <PageHeader title={title} subtitle={`Live data from ${resource}`} />
      <Card>
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <Spinner />
          </div>
        )}
        {error && <p className="text-sm text-signal-red">Failed to load: {(error as Error).message}</p>}
        {data != null && (
          <pre className="max-h-[60vh] overflow-auto rounded bg-base-950 p-3 text-xs text-slate-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </Card>
    </div>
  );
}
