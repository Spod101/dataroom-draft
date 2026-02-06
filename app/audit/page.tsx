import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ClipboardListIcon, 
  DownloadIcon, 
  EyeIcon, 
  UploadIcon, 
  TrashIcon,
  ShareIcon,
  SearchIcon,
  FilterIcon,
} from "lucide-react";

export default function AuditPage() {
  const auditLogs = [
    {
      id: 1,
      user: "Alice Johnson",
      action: "Downloaded",
      document: "Investment Prospectus 2024.pdf",
      timestamp: "2024-02-06 14:32:15",
      ip: "192.168.1.105",
      status: "success",
      icon: DownloadIcon,
    },
    {
      id: 2,
      user: "Bob Smith",
      action: "Viewed",
      document: "Financial Statements Q4.xlsx",
      timestamp: "2024-02-06 14:28:42",
      ip: "192.168.1.112",
      status: "success",
      icon: EyeIcon,
    },
    {
      id: 3,
      user: "Carol White",
      action: "Uploaded",
      document: "Market Analysis Report.pdf",
      timestamp: "2024-02-06 13:15:33",
      ip: "192.168.1.98",
      status: "success",
      icon: UploadIcon,
    },
    {
      id: 4,
      user: "David Brown",
      action: "Shared",
      document: "Legal Framework Overview.docx",
      timestamp: "2024-02-06 12:45:21",
      ip: "192.168.1.87",
      status: "success",
      icon: ShareIcon,
    },
    {
      id: 5,
      user: "Eve Wilson",
      action: "Deleted",
      document: "Old Project Files.zip",
      timestamp: "2024-02-06 11:20:15",
      ip: "192.168.1.76",
      status: "warning",
      icon: TrashIcon,
    },
    {
      id: 6,
      user: "Frank Miller",
      action: "Downloaded",
      document: "Technical Architecture.pdf",
      timestamp: "2024-02-06 10:55:08",
      ip: "192.168.1.134",
      status: "success",
      icon: DownloadIcon,
    },
  ];

  const summary = [
    { label: "Total Actions Today", value: "156" },
    { label: "Unique Users", value: "23" },
    { label: "Failed Attempts", value: "3" },
    { label: "Downloads", value: "45" },
  ];

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Audit Log</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {summary.map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Complete audit trail of all actions</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <FilterIcon className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search audit logs..."
                  className="pl-8"
                />
              </div>
            </div>
            <div className="divide-y">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      log.status === "warning" ? "bg-yellow-500/10" : "bg-primary/10"
                    }`}>
                      <log.icon className={`h-4 w-4 ${
                        log.status === "warning" ? "text-yellow-500" : "text-primary"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {log.user} {log.action.toLowerCase()} <span className="text-muted-foreground">{log.document}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.timestamp} • IP: {log.ip}
                      </p>
                    </div>
                  </div>
                  <Badge variant={log.status === "warning" ? "destructive" : "default"}>
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
