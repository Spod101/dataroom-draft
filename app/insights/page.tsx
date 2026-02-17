"use client";

import * as React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchBar } from "@/components/dataroom/search-bar";
import { FilterSelect } from "@/components/dataroom/filter-select";
import { FileTextIcon, UsersIcon, EyeIcon, DownloadIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { InsightsFileListSkeleton, InsightsStatsSkeleton, InsightsUserTableSkeleton } from "@/components/insights/insights-skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type FileSummary = {
  id: string;
  name: string;
  folderId: string | null;
  folderPath: string | null;
  views: number;
  downloads: number;
};

type UserFileStats = {
  identityKey: string;
  userName: string;
  views: number;
  downloads: number;
};

export default function InsightsPage() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [fileSummaries, setFileSummaries] = React.useState<FileSummary[]>([]);
  const [selectedFileId, setSelectedFileId] = React.useState<string | null>(null);
  const [perFileUserMap, setPerFileUserMap] = React.useState<
    Map<string, Map<string, { views: number; downloads: number }>> | null
  >(null);
  const [identityLabelMap, setIdentityLabelMap] = React.useState<Map<string, string> | null>(
    null
  );
  const [perFileViewSeries, setPerFileViewSeries] = React.useState<
    Map<string, { date: string; count: number }[]>
  >();
  const [userStats, setUserStats] = React.useState<UserFileStats[]>([]);
  const [searchFile, setSearchFile] = React.useState("");
  const [searchUser, setSearchUser] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewsRange, setViewsRange] = React.useState<"7d" | "30d" | "90d" | "all">("7d");

  React.useEffect(() => {
    async function loadInsights() {
      setLoading(true);
      setError(null);
      try {
        const { data: events, error: eventsError } = await supabase
          .from("file_events")
          .select("id, created_at, event_type, file_id, user_id, folder_id, details")
          .order("created_at", { ascending: false })
          .limit(1000);

        if (eventsError) throw eventsError;

        const ev = (events ?? []) as any[];
        if (!ev.length) {
          setFileSummaries([]);
          setUserStats([]);
          setSelectedFileId(null);
          return;
        }

        const fileIds = Array.from(new Set(ev.map((e) => e.file_id as string)));
        const userIds = Array.from(
          new Set(
            ev
              .map((e) => e.user_id as string | null)
              .filter((v): v is string => !!v)
          )
        );

        const [filesRes, usersRes, foldersRes] = await Promise.all([
          supabase.from("files").select("id, name, folder_id").in("id", fileIds),
          userIds.length
            ? supabase.from("users").select("id, name").in("id", userIds)
            : Promise.resolve({ data: [], error: null }),
          supabase.from("folders").select("id, name, parent_folder_id"),
        ]);

        if (filesRes.error) throw filesRes.error;
        if (usersRes.error) throw usersRes.error;
        if (foldersRes.error) throw foldersRes.error;

        const files = (filesRes.data ?? []) as any[];
        const users = (usersRes.data ?? []) as any[];
        const folders = (foldersRes.data ?? []) as any[];

        const fileMap = new Map<string, { name: string; folderId: string | null }>();
        for (const f of files) {
          fileMap.set(f.id as string, {
            name: f.name as string,
            folderId: (f.folder_id as string | null) ?? null,
          });
        }

        const userMap = new Map<string, string>();
        for (const u of users) {
          userMap.set(u.id as string, ((u.name as string | null) ?? "Unknown user") as string);
        }

        const folderMetaMap = new Map<string, { name: string; parentId: string | null }>();
        for (const f of folders) {
          folderMetaMap.set(f.id as string, {
            name: f.name as string,
            parentId: (f.parent_folder_id as string | null) ?? null,
          });
        }

        const folderPathCache = new Map<string, string>();
        function getFolderPath(folderId: string | null): string | null {
          if (!folderId) return null;
          const cached = folderPathCache.get(folderId);
          if (cached) return cached;

          const parts: string[] = [];
          let current: string | null = folderId;
          let safety = 0;
          while (current && safety < 50) {
            const meta = folderMetaMap.get(current);
            if (!meta) break;
            parts.push(meta.name);
            current = meta.parentId;
            safety += 1;
          }

          if (!parts.length) return null;
          const path = parts.reverse().join(" / ");
          folderPathCache.set(folderId, path);
          return path;
        }

        const perFile = new Map<string, { views: number; downloads: number }>();
        const perFileUser = new Map<string, Map<string, { views: number; downloads: number }>>();
        const identityLabels = new Map<string, string>();
        const perFileViewTimeline = new Map<string, Map<string, number>>();

        for (const e of ev) {
          const fid = e.file_id as string;
          const details = (e.details as Record<string, any>) || {};
          const rawEmail =
            typeof details.email === "string" && details.email.trim()
              ? (details.email as string).trim()
              : null;

          let identityKey: string;
          let displayName: string;

          if (e.user_id) {
            identityKey = `user:${e.user_id as string}`;
            displayName = userMap.get(e.user_id as string) ?? "Unknown user";
          } else if (rawEmail) {
            identityKey = `email:${rawEmail.toLowerCase()}`;
            displayName = rawEmail;
          } else {
            identityKey = "unknown";
            displayName = "Unknown user";
          }

          identityLabels.set(identityKey, displayName);

          const fileAgg = perFile.get(fid) ?? { views: 0, downloads: 0 };
          const userMapForFile =
            perFileUser.get(fid) ?? new Map<string, { views: number; downloads: number }>();
          const userAgg = userMapForFile.get(identityKey) ?? { views: 0, downloads: 0 };

          if (e.event_type === "view") {
            fileAgg.views += 1;
            userAgg.views += 1;

            // Track views over time (by date) for charts
            const createdAt = new Date(e.created_at as string);
            const dateKey = createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
            const fileTimeline =
              perFileViewTimeline.get(fid) ?? new Map<string, number>();
            const currentCount = fileTimeline.get(dateKey) ?? 0;
            fileTimeline.set(dateKey, currentCount + 1);
            perFileViewTimeline.set(fid, fileTimeline);
          } else if (e.event_type === "download") {
            fileAgg.downloads += 1;
            userAgg.downloads += 1;
          }

          perFile.set(fid, fileAgg);
          userMapForFile.set(identityKey, userAgg);
          perFileUser.set(fid, userMapForFile);
        }

        const summaries: FileSummary[] = [];
        for (const [fileId, stats] of perFile.entries()) {
          const meta = fileMap.get(fileId);
          if (!meta) continue;
          const folderPath = getFolderPath(meta.folderId);
          summaries.push({
            id: fileId,
            name: meta.name,
            folderId: meta.folderId,
            folderPath,
            views: stats.views,
            downloads: stats.downloads,
          });
        }

        summaries.sort((a, b) => (b.views + b.downloads) - (a.views + a.downloads));

        setFileSummaries(summaries);
        const initialFileId = summaries[0]?.id ?? null;
        setSelectedFileId(initialFileId);
        setPerFileUserMap(perFileUser);
        setIdentityLabelMap(identityLabels);

        const viewSeriesMap = new Map<string, { date: string; count: number }[]>();
        for (const [fileId, seriesMap] of perFileViewTimeline.entries()) {
          const points = Array.from(seriesMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));
          viewSeriesMap.set(fileId, points);
        }
        setPerFileViewSeries(viewSeriesMap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load insights");
      } finally {
        setLoading(false);
      }
    }

    void loadInsights();
  }, []);

  // Recompute per-user stats whenever the selected file or aggregates change.
  React.useEffect(() => {
    if (!selectedFileId || !perFileUserMap || !identityLabelMap) {
      setUserStats([]);
      return;
    }

    const userMapForFile = perFileUserMap.get(selectedFileId);
    if (!userMapForFile) {
      setUserStats([]);
      return;
    }

    const stats: UserFileStats[] = [];
    for (const [identityKey, agg] of userMapForFile.entries()) {
      const name = identityLabelMap.get(identityKey) ?? "Unknown user";
      stats.push({
        identityKey,
        userName: name,
        views: agg.views,
        downloads: agg.downloads,
      });
    }
    stats.sort((a, b) => b.views - a.views || b.downloads - a.downloads);
    setUserStats(stats);
  }, [selectedFileId, perFileUserMap, identityLabelMap]);

  const filteredFiles = fileSummaries.filter((f) =>
    f.name.toLowerCase().includes(searchFile.toLowerCase())
  );

  const selectedFile = fileSummaries.find((f) => f.id === selectedFileId) ?? null;

  const filteredUserStats = userStats.filter((u) =>
    u.userName.toLowerCase().includes(searchUser.toLowerCase())
  );

  const uniqueUsersForSelectedFile = React.useMemo(() => {
    if (!selectedFileId || !perFileUserMap) return 0;
    return perFileUserMap.get(selectedFileId)?.size ?? 0;
  }, [selectedFileId, perFileUserMap]);

  const chartSeries = React.useMemo(() => {
    if (!selectedFileId || !perFileViewSeries) return [];
    const rawSeries = perFileViewSeries.get(selectedFileId) ?? [];

    if (!rawSeries.length) return [];

    // Map of ISO date -> view count for this file
    const countsByDate = new Map<string, number>();
    for (const point of rawSeries) {
      countsByDate.set(point.date, point.count);
    }

    // Helper to build a padded last-N-days window (including days with 0 views)
    const buildWindow = (days: number) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result: { date: string; label: string; views: number }[] = [];
      for (let offset = days - 1; offset >= 0; offset -= 1) {
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
        const isoKey = d.toISOString().slice(0, 10);
        const views = countsByDate.get(isoKey) ?? 0;
        const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        result.push({ date: isoKey, label, views });
      }
      return result;
    };

    if (viewsRange === "7d") return buildWindow(7);
    if (viewsRange === "30d") return buildWindow(30);
    if (viewsRange === "90d") return buildWindow(90);

    // "all" – use the actual dates we have, in order, without padding
    const sorted = [...rawSeries].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((point) => {
      const d = new Date(point.date);
      const label = Number.isNaN(d.getTime())
        ? point.date
        : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return {
        date: point.date,
        label,
        views: point.count,
      };
    });
  }, [selectedFileId, perFileViewSeries, viewsRange]);

  const chartDateRangeLabel = React.useMemo(() => {
    if (!chartSeries.length) return null;
    return {
      start: chartSeries[0].label,
      end: chartSeries[chartSeries.length - 1].label,
    };
  }, [chartSeries]);

  // Show access denied for non-admins
  if (!authLoading && !isAdmin) {
    return (
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb className="ml-2 px-3 py-1 rounded-md bg-muted/50">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Insights</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">
            Only administrators can access insights. You have view-only access to this page.
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
              <BreadcrumbPage>Insights</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 p-4 md:p-6 gap-4">
        <Card className="w-[280px] flex-shrink-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Files</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="px-4 pb-3">
              <SearchBar
                placeholder="Search file"
                value={searchFile}
                onSearch={setSearchFile}
                variant="compact"
              />
            </div>

            <div className="flex-1 overflow-auto px-2">
              {loading && <InsightsFileListSkeleton />}
              {!loading && filteredFiles.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No file events yet.
                </div>
              )}
              {!loading &&
                filteredFiles.map((file) => {
                  const isSelected = file.id === selectedFileId;
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setSelectedFileId(file.id)}
                      className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm mb-1 ${
                        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent/50"
                      }`}
                    >
                      <FileTextIcon
                        className={`h-4 w-4 ${
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        }`}
                      />
                      <span className="truncate flex-1">{file.name}</span>
                    </button>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col gap-4">
          {loading ? (
            <InsightsStatsSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <EyeIcon className="h-4 w-4" />
                    <span>Total views</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {selectedFile ? selectedFile.views : 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <DownloadIcon className="h-4 w-4" />
                    <span>Total downloads</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {selectedFile ? selectedFile.downloads : 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <UsersIcon className="h-4 w-4" />
                    <span>Unique users</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {selectedFile ? uniqueUsersForSelectedFile : 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  Views over time
                </CardTitle>
                {selectedFile && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Location: {selectedFile.folderPath ?? "Root"}
                  </p>
                )}
              </div>
              <div className="w-full sm:w-[180px]">
                <FilterSelect
                  label="Range"
                  value={viewsRange}
                  onValueChange={(value) =>
                    setViewsRange(value as "7d" | "30d" | "90d" | "all")
                  }
                  options={[
                    { id: "7d", name: "Last 7 days" },
                    { id: "30d", name: "Last 30 days" },
                    { id: "90d", name: "Last 90 days" },
                    { id: "all", name: "All time" },
                  ]}
                  width="w-full"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                {chartSeries.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No view data for this file yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#d1d5db" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#d1d5db" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} views`, "Views"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend
                        verticalAlign="top"
                        height={24}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        name="Views"
                        stroke="#eab308"
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 1, fill: "#facc15" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Views per day</span>
                <span>
                  {chartDateRangeLabel
                    ? `${chartDateRangeLabel.start} → ${chartDateRangeLabel.end}`
                    : "No data"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="pt-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium">Users for this file</p>
                <div className="w-64">
                  <SearchBar
                    placeholder="Search user"
                    value={searchUser}
                    onSearch={setSearchUser}
                    variant="compact"
                  />
                </div>
              </div>

              <div className="flex items-center py-2 px-2 text-sm text-muted-foreground border-b">
                <span className="flex-1">User</span>
                <span className="w-20 text-center">Views</span>
                <span className="w-24 text-center">Downloads</span>
              </div>

              <div className="divide-y">
                {loading && <InsightsUserTableSkeleton />}
                {selectedFile && !loading && filteredUserStats.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    No user activity for this file yet.
                  </div>
                )}
                {!loading && selectedFile &&
                  filteredUserStats.map((user) => (
                    <div key={user.identityKey} className="flex items-center py-3 px-2">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.userName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.userName}</p>
                        </div>
                      </div>
                      <span className="w-20 text-center text-sm">{user.views}</span>
                      <span className="w-24 text-center text-sm">{user.downloads}</span>
                    </div>
                  ))}
              </div>

              {!selectedFile && !loading && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Select a file on the left to see who accessed or downloaded it.
                </div>
              )}

              {error && (
                <div className="mt-4 text-sm text-destructive">
                  Failed to load insights: {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}
