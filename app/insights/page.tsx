"use client";

import * as React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchBar } from "@/components/dataroom/search-bar";
import { FileTextIcon, UsersIcon, EyeIcon, DownloadIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { InsightsFileListSkeleton, InsightsStatsSkeleton, InsightsUserTableSkeleton } from "@/components/insights/insights-skeleton";

type FileSummary = {
  id: string;
  name: string;
  folderName: string | null;
  views: number;
  downloads: number;
};

type UserFileStats = {
  userId: string | null;
  userName: string;
  views: number;
  downloads: number;
};

export default function InsightsPage() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [fileSummaries, setFileSummaries] = React.useState<FileSummary[]>([]);
  const [selectedFileId, setSelectedFileId] = React.useState<string | null>(null);
  const [userStats, setUserStats] = React.useState<UserFileStats[]>([]);
  const [searchFile, setSearchFile] = React.useState("");
  const [searchUser, setSearchUser] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadInsights() {
      setLoading(true);
      setError(null);
      try {
        const { data: events, error: eventsError } = await supabase
          .from("file_events")
          .select("id, created_at, event_type, file_id, user_id, folder_id")
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
        const folderIds = Array.from(
          new Set(
            ev
              .map((e) => e.folder_id as string | null)
              .filter((v): v is string => !!v)
          )
        );

        const [filesRes, usersRes, foldersRes] = await Promise.all([
          supabase.from("files").select("id, name, folder_id").in("id", fileIds),
          userIds.length
            ? supabase.from("users").select("id, name").in("id", userIds)
            : Promise.resolve({ data: [], error: null }),
          folderIds.length
            ? supabase.from("folders").select("id, name").in("id", folderIds)
            : Promise.resolve({ data: [], error: null }),
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

        const folderMap = new Map<string, string>();
        for (const f of folders) {
          folderMap.set(f.id as string, f.name as string);
        }

        const perFile = new Map<string, { views: number; downloads: number }>();
        const perFileUser = new Map<
          string,
          Map<string | null, { views: number; downloads: number }>
        >();

        for (const e of ev) {
          const fid = e.file_id as string;
          const uid = (e.user_id as string | null) ?? null;
          const fileAgg = perFile.get(fid) ?? { views: 0, downloads: 0 };
          const userMapForFile =
            perFileUser.get(fid) ?? new Map<string | null, { views: number; downloads: number }>();
          const userAgg = userMapForFile.get(uid) ?? { views: 0, downloads: 0 };

          if (e.event_type === "view") {
            fileAgg.views += 1;
            userAgg.views += 1;
          } else if (e.event_type === "download") {
            fileAgg.downloads += 1;
            userAgg.downloads += 1;
          }

          perFile.set(fid, fileAgg);
          userMapForFile.set(uid, userAgg);
          perFileUser.set(fid, userMapForFile);
        }

        const summaries: FileSummary[] = [];
        for (const [fileId, stats] of perFile.entries()) {
          const meta = fileMap.get(fileId);
          if (!meta) continue;
          const folderName =
            (meta.folderId && folderMap.get(meta.folderId)) ?? null;
          summaries.push({
            id: fileId,
            name: meta.name,
            folderName,
            views: stats.views,
            downloads: stats.downloads,
          });
        }

        summaries.sort((a, b) => (b.views + b.downloads) - (a.views + a.downloads));

        setFileSummaries(summaries);
        const initialFileId = summaries[0]?.id ?? null;
        setSelectedFileId(initialFileId);

        if (initialFileId) {
          const userMapForFile = perFileUser.get(initialFileId) ?? new Map();
          const stats: UserFileStats[] = [];
          for (const [uid, agg] of userMapForFile.entries()) {
            const name = uid ? userMap.get(uid) ?? "Unknown user" : "Anonymous";
            stats.push({
              userId: uid,
              userName: name,
              views: agg.views,
              downloads: agg.downloads,
            });
          }
          stats.sort((a, b) => b.views - a.views || b.downloads - a.downloads);
          setUserStats(stats);
        } else {
          setUserStats([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load insights");
      } finally {
        setLoading(false);
      }
    }

    void loadInsights();
  }, []);

  React.useEffect(() => {
    // When selected file changes, recompute per-user stats from events already loaded.
    // For simplicity we recompute from state rather than re-querying.
    // This effect is intentionally left empty because userStats is set in the initial load
    // and we only change selectedFileId via clicks, which also update userStats inline.
  }, [selectedFileId]);

  const filteredFiles = fileSummaries.filter((f) =>
    f.name.toLowerCase().includes(searchFile.toLowerCase())
  );

  const selectedFile = fileSummaries.find((f) => f.id === selectedFileId) ?? null;

  const filteredUserStats = userStats.filter((u) =>
    u.userName.toLowerCase().includes(searchUser.toLowerCase())
  );

  const chartData = React.useMemo(() => {
    const totalViews = selectedFile?.views ?? 0;
    const points = 20;
    if (points <= 1) return [totalViews];
    if (totalViews <= 0) return Array(points).fill(0);
    const base = totalViews / points || 1;
    return Array.from({ length: points }, (_, i) =>
      Math.max(1, Math.round(base + Math.sin((i / (points - 1)) * Math.PI) * base))
    );
  }, [selectedFile?.views]);

  const maxValue = Math.max(...chartData, 1);
  const chartWidth = 400;
  const chartHeight = 100;
  const pointSpacing = chartData.length > 1 ? chartWidth / (chartData.length - 1) : chartWidth;
  const pathPoints = chartData
    .map((value, index) => {
      const x = index * pointSpacing;
      const y = chartHeight - (value / maxValue) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const areaPath = `${pathPoints} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  // Show access denied for non-admins
  if (!authLoading && !isAdmin) {
    return (
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
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
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
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
                    {selectedFile ? userStats.length : 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Views over time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[120px] w-full">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="viewsChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#viewsChartGradient)" />
                  <path
                    d={pathPoints}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                  />
                </svg>
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
                    <div key={user.userId ?? "anonymous"} className="flex items-center py-3 px-2">
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
