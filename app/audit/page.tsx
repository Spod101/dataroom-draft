"use client";

import * as React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/dataroom/search-bar";
import { FilterSelect } from "@/components/dataroom/filter-select";
import { DownloadButton } from "@/components/dataroom/download-button";
import { TablePagination } from "@/components/ui/table-pagination";
import { generateAuditPDF } from "@/lib/audit-pdf-export";

const PAGE_SIZE = 10;
import { ChevronDownIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

type AuditDisplayRow = {
  id: string;
  date: string;
  createdAt: string;
  member: string;
  actionLabel: string;
  description: string;
};

type PeriodFilterValue = "last_24h" | "last_7d" | "last_30d" | "last_90d" | "all";

function getPeriodLabel(value: PeriodFilterValue): string {
  switch (value) {
    case "last_24h":
      return "Last 24 hours";
    case "last_7d":
      return "Last 7 days";
    case "last_30d":
      return "Last 30 days";
    case "last_90d":
      return "Last 90 days";
    case "all":
    default:
      return "All time";
  }
}

const getActionStyle = (action: string) => {
  switch (action.toLowerCase()) {
    case "view":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "upload":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "create":
      return "bg-green-100 text-green-700 border-green-200";
    case "rename":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "delete":
      return "bg-red-100 text-red-700 border-red-200";
    case "permanently deleted":
      return "bg-red-100 text-red-700 border-red-200";
    case "download":
      return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "restore":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

function formatActionLabel(action: string): string {
  if (action.startsWith("file.")) {
    const kind = action.slice("file.".length);
    if (kind === "view") return "View";
    if (kind === "upload") return "Upload";
    if (kind === "rename") return "Rename";
    if (kind === "delete") return "Delete";
    if (kind === "hard_delete") return "Permanently deleted";
    if (kind === "download") return "Download";
    if (kind === "restore") return "Restore";
  }
  if (action.startsWith("folder.")) {
    const kind = action.slice("folder.".length);
    if (kind === "create") return "Create";
    if (kind === "rename") return "Rename";
    if (kind === "delete") return "Delete";
    if (kind === "hard_delete") return "Permanently deleted";
    if (kind === "restore") return "Restore";
  }
  return action;
}

export default function AuditPage() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [searchTerm, setSearchTerm] = React.useState("");
  const [memberFilter, setMemberFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [periodFilter, setPeriodFilter] = React.useState<PeriodFilterValue>("last_30d");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  const [rows, setRows] = React.useState<AuditDisplayRow[]>([]);
  const [members, setMembers] = React.useState<string[]>([]);
  const [actions, setActions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadAudit() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: auditError } = await supabase
          .from("audit_log")
          .select("id, created_at, action, target_type, user_id, file_id, folder_id, details")
          .order("created_at", { ascending: false })
          .limit(200);

        if (auditError) throw auditError;

        const audit = data ?? [];
        const userIds = Array.from(
          new Set(
            audit
              .map((r) => r.user_id as string | null)
              .filter((v): v is string => !!v)
          )
        );
        const fileIds = Array.from(
          new Set(
            audit
              .map((r) => r.file_id as string | null)
              .filter((v): v is string => !!v)
          )
        );
        const folderIds = Array.from(
          new Set(
            audit
              .map((r) => r.folder_id as string | null)
              .filter((v): v is string => !!v)
          )
        );

        const [usersRes, filesRes, foldersRes] = await Promise.all([
          userIds.length
            ? supabase.from("users").select("id, name").in("id", userIds)
            : Promise.resolve({ data: [], error: null }),
          fileIds.length
            ? supabase.from("files").select("id, name").in("id", fileIds)
            : Promise.resolve({ data: [], error: null }),
          folderIds.length
            ? supabase.from("folders").select("id, name").in("id", folderIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (usersRes.error) throw usersRes.error;
        if (filesRes.error) throw filesRes.error;
        if (foldersRes.error) throw foldersRes.error;

        const userMap = new Map<string, string>();
        for (const u of usersRes.data ?? []) {
          userMap.set((u as any).id, ((u as any).name as string | null) ?? "Unknown");
        }

        const fileMap = new Map<string, string>();
        for (const f of filesRes.data ?? []) {
          fileMap.set((f as any).id, (f as any).name as string);
        }

        const folderMap = new Map<string, string>();
        for (const f of foldersRes.data ?? []) {
          folderMap.set((f as any).id, (f as any).name as string);
        }

        const displayRows: AuditDisplayRow[] = (audit as any[]).map((row) => {
          const details = (row.details as Record<string, any>) || {};
          const detailsEmail =
            typeof details.email === "string" && details.email.trim() ? details.email.trim() : null;
          const member =
            (row.user_id && userMap.get(row.user_id)) ||
            detailsEmail ||
            "Unknown user";
          const actionLabel = formatActionLabel(row.action as string);

          const fileName = row.file_id ? fileMap.get(row.file_id) : undefined;
          const folderName = row.folder_id ? folderMap.get(row.folder_id) : undefined;
          let description = "";

          const action = row.action as string;
          
          // File actions with detailed descriptions
          if (action === "file.hard_delete") {
            const deletedFileName =
              (details.deleted_file_id ? fileMap.get(details.deleted_file_id) : undefined) ??
              (typeof details.name === "string" && details.name.trim() ? details.name.trim() : undefined) ??
              fileName;
            description = `${member} permanently deleted file "${deletedFileName || "Unknown"}"`;
          } else if (action === "file.view") {
            const viewedFileName =
              (typeof details.name === "string" && details.name.trim() ? details.name.trim() : undefined) ??
              fileName;
            description = `${member} viewed file "${viewedFileName || "Unknown"}"`;
          } else if (action === "file.upload") {
            const uploadedFileName = details.name || fileName;
            const fileSize = details.size ? ` (${(details.size / 1024).toFixed(1)} KB)` : '';
            const fileType = details.type ? ` [${details.type}]` : '';
            description = `${member} uploaded "${uploadedFileName}"${fileSize}${fileType}`;
          } else if (action === "file.rename") {
            const oldName = details.oldName;
            const newName = details.newName || fileName;
            if (oldName && newName) {
              description = `${member} renamed file from "${oldName}" to "${newName}"`;
            } else {
              description = `${member} renamed file to "${newName || fileName || 'Unknown'}"`;
            }
          } else if (action === "file.delete") {
            const deletedFileName =
              (typeof details.name === "string" && details.name.trim() ? details.name.trim() : undefined) ??
              fileName;
            description = `${member} moved file "${deletedFileName || "Unknown"}" to trash`;
          } else if (action === "file.download") {
            const downloadedFileName =
              (typeof details.name === "string" && details.name.trim() ? details.name.trim() : undefined) ??
              fileName;
            description = `${member} downloaded file "${downloadedFileName || "Unknown"}"`;
          } else if (action === "file.restore") {
            const restoredFileName =
              (typeof details.name === "string" && details.name.trim() ? details.name.trim() : undefined) ??
              fileName;
            description = `${member} restored file "${restoredFileName || "Unknown"}" from trash`;
          }
          
          // Folder actions with detailed descriptions
          else if (action === "folder.hard_delete") {
            const deletedFolderName =
              (details.deleted_folder_id ? folderMap.get(details.deleted_folder_id) : undefined) ??
              (typeof details.name === "string" && details.name.trim() ? details.name.trim() : undefined) ??
              folderName;
            description = `${member} permanently deleted folder "${deletedFolderName || "Unknown"}"`;
          } else if (action === "folder.create") {
            const createdFolderName = details.name || folderName;
            description = `${member} created folder "${createdFolderName || 'Unknown'}"`;
          } else if (action === "folder.rename") {
            const oldName = details.oldName;
            const newName = details.newName || folderName;
            if (oldName && newName) {
              description = `${member} renamed folder from "${oldName}" to "${newName}"`;
            } else {
              description = `${member} renamed folder to "${newName || folderName || 'Unknown'}"`;
            }
          } else if (action === "folder.delete") {
            const deletedFolderName =
              (typeof details.name === "string" && details.name.trim() ? details.name.trim() : undefined) ??
              folderName;
            description = `${member} moved folder "${deletedFolderName || "Unknown"}" to trash`;
          } else if (action === "folder.restore") {
            const restoredFolderName =
              (typeof details.name === "string" && details.name.trim() ? details.name.trim() : undefined) ??
              folderName;
            description = `${member} restored folder "${restoredFolderName || "Unknown"}" from trash`;
          } else if (action === "folder.move") {
            const movedFolderName = details.folderName || folderName;
            const oldParent = details.oldParentName || "Root";
            const newParent = details.newParentName || "Root";
            description = `${member} moved folder "${movedFolderName}" from "${oldParent}" to "${newParent}"`;
          }
          
          // Fallback for unknown actions
          else {
            description = `${member} performed action: ${action}`;
          }

          return {
            id: row.id as string,
            date: new Date(row.created_at as string).toLocaleString(),
            createdAt: row.created_at as string,
            member,
            actionLabel,
            description,
          };
        });

        setRows(displayRows);
        setMembers(Array.from(new Set(displayRows.map((r) => r.member))).sort());
        setActions(Array.from(new Set(displayRows.map((r) => r.actionLabel))).sort());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load audit log");
      } finally {
        setLoading(false);
      }
    }

    void loadAudit();
  }, []);

  const filteredLogs = rows.filter((log) => {
    const createdAt = new Date(log.createdAt);
    const now = new Date();
    let matchesPeriod = true;

    if (startDate || endDate) {
      const from = startDate ? new Date(startDate) : null;
      const to = endDate ? new Date(endDate) : null;

      if (from && createdAt < from) {
        matchesPeriod = false;
      }
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        if (createdAt > endOfDay) {
          matchesPeriod = false;
        }
      }
    } else {
      let fromDate: Date | null = null;

      switch (periodFilter) {
        case "last_24h": {
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        }
        case "last_7d": {
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        }
        case "last_30d": {
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        }
        case "last_90d": {
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        }
        case "all":
        default:
          fromDate = null;
      }

      matchesPeriod = !fromDate || createdAt >= fromDate;
    }
    const matchesSearch =
      searchTerm === "" ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.member.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMember = memberFilter === "all" || log.member === memberFilter;
    const matchesAction =
      actionFilter === "all" || log.actionLabel.toLowerCase() === actionFilter.toLowerCase();

    return matchesSearch && matchesMember && matchesAction && matchesPeriod;
  });

  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Reset to first page only when the user changes filters/search.
  React.useEffect(
    () => setPage(1),
    [searchTerm, memberFilter, actionFilter, periodFilter, startDate, endDate]
  );
  // Keep current page when data changes; clamp if page becomes invalid.
  React.useEffect(() => setPage((p) => Math.min(Math.max(p, 1), totalPages)), [totalPages]);

  const dateRangeLabel = React.useMemo(() => {
    if (startDate || endDate) {
      if (startDate && endDate) {
        return `From ${startDate} to ${endDate}`;
      }
      if (startDate) {
        return `From ${startDate}`;
      }
      return `Until ${endDate}`;
    }
    return getPeriodLabel(periodFilter);
  }, [startDate, endDate, periodFilter]);

  // Handle PDF download
  const handleDownloadPDF = React.useCallback(() => {
    generateAuditPDF({
      logs: filteredLogs,
      filters: {
        searchTerm,
        memberFilter: memberFilter !== "all" ? memberFilter : undefined,
        actionFilter: actionFilter !== "all" ? actionFilter : undefined,
        dateRange: dateRangeLabel,
      },
      organizationName: "Data Room", // You can customize this or get it from context
    });
  }, [filteredLogs, searchTerm, memberFilter, actionFilter, dateRangeLabel]);

  // Show access denied for non-admins
  if (!authLoading && !isAdmin) {
    return (
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb className="ml-2 px-3 py-1 rounded-md bg-muted/50">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Audit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">
            Only administrators can access audit logs. You have view-only access to this page.
          </p>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumb className="ml-2 px-3 py-1 rounded-md bg-muted/50">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Audit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="bg-background rounded-xl border border-primary/20 shadow-sm p-3 hover:border-primary/40 transition-colors">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              label="Members"
              value={memberFilter}
              onValueChange={setMemberFilter}
              options={[
                { id: "all", name: "All" },
                ...members.map((name) => ({ id: name, name })),
              ]}
            />

            <FilterSelect
              label="Actions"
              value={actionFilter}
              onValueChange={setActionFilter}
              options={[
                { id: "all", name: "All" },
                ...actions.map((name) => ({ id: name.toLowerCase(), name })),
              ]}
            />

            <FilterSelect
              label="Period"
              value={periodFilter}
              onValueChange={(value) => setPeriodFilter(value as PeriodFilterValue)}
              width="w-[150px]"
              options={[
                { id: "last_24h", name: "Last 24 hours" },
                { id: "last_7d", name: "Last 7 days" },
                { id: "last_30d", name: "Last 30 days" },
                { id: "last_90d", name: "Last 90 days" },
                { id: "all", name: "All time" },
              ]}
            />

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From</span>
              <input
                type="date"
                className="h-9 rounded-lg border border-primary/20 bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To</span>
              <input
                type="date"
                className="h-9 rounded-lg border border-primary/20 bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="ml-auto">
              <DownloadButton onClick={handleDownloadPDF} />
            </div>
          </div>
        </div>

        <SearchBar
          placeholder="Search audit logs..."
          value={searchTerm}
          onSearch={setSearchTerm}
        />

        <Card className="border-primary/20 flex-1">
          <CardContent className="p-0">
            <div className="grid grid-cols-[160px_1fr_140px_2fr] gap-4 px-6 py-3 border-b bg-muted/30 text-sm text-muted-foreground">
              <div>Date</div>
              <div>Member</div>
              <div>Action</div>
              <div>Description</div>
            </div>

            <div className="divide-y">
              {loading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Loading audit logs...
                </div>
              )}
              {!loading &&
                !error &&
                paginatedLogs.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-[160px_1fr_140px_2fr] gap-4 px-6 py-4 hover:bg-accent/50 transition-colors items-center"
                  >
                    <div className="text-sm text-muted-foreground">{log.date}</div>
                    <div className="text-sm font-medium">{log.member}</div>
                    <div className="min-w-0 py-0.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getActionStyle(
                          log.actionLabel
                        )}`}
                      >
                        {log.actionLabel}
                      </span>
                    </div>
                    <div className="text-sm min-w-0">{log.description}</div>
                  </div>
                ))}
            </div>

            {!loading && !error && filteredLogs.length > 0 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredLogs.length}
                onPageChange={setPage}
              />
            )}

            {!loading && error && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Failed to load audit logs: {error}
              </div>
            )}

            {!loading && !error && filteredLogs.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                No audit logs found matching your filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
