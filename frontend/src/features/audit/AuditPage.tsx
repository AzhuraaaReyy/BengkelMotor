import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { getAuditLogsApi } from "@/lib/api/audit";
import { formatDateTime } from "@/lib/formatters";
import type { AuditLog } from "@/types";

export function AuditPage() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLogsApi({ page, per_page: 20 });
      setData(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal memuat audit log.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      label: "Waktu",
      render: (r) => formatDateTime(r.created_at),
    },
    { key: "user", label: "User", render: (r) => r.user?.name || "-" },
    {
      key: "action",
      label: "Aksi",
      render: (r) => <Badge tone="info">{r.action}</Badge>,
    },
    { key: "entity_type", label: "Entitas", render: (r) => r.entity_type },
    {
      key: "entity_id",
      label: "ID",
      render: (r) => (r.entity_id != null ? `#${r.entity_id}` : "-"),
    },
    { key: "reason", label: "Alasan", render: (r) => r.reason || "-" },
  ];

  return (
    <div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <DataTable columns={columns} data={data} keyExtractor={(r) => r.id} />
          <Pagination
            currentPage={page}
            lastPage={lastPage}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
