import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChartIcon, 
  TrendingUpIcon, 
  UsersIcon, 
  FileTextIcon, 
  DownloadIcon,
  EyeIcon,
} from "lucide-react";

export default function InsightsPage() {
  const stats = [
    {
      title: "Total Documents",
      value: "1,284",
      change: "+12.5%",
      icon: FileTextIcon,
      trend: "up"
    },
    {
      title: "Active Users",
      value: "23",
      change: "+3",
      icon: UsersIcon,
      trend: "up"
    },
    {
      title: "Total Views",
      value: "8,429",
      change: "+18.2%",
      icon: EyeIcon,
      trend: "up"
    },
    {
      title: "Downloads",
      value: "432",
      change: "-5.1%",
      icon: DownloadIcon,
      trend: "down"
    },
  ];

  const topDocuments = [
    { name: "Investment Prospectus 2024", views: 156, downloads: 45 },
    { name: "Financial Statements Q4", views: 134, downloads: 38 },
    { name: "Legal Framework Overview", views: 98, downloads: 27 },
    { name: "Technical Architecture", views: 87, downloads: 22 },
    { name: "Market Analysis Report", views: 76, downloads: 19 },
  ];

  const recentActivity = [
    { user: "Alice Johnson", action: "viewed", document: "Investment Prospectus 2024", time: "2 minutes ago" },
    { user: "Bob Smith", action: "downloaded", document: "Financial Statements Q4", time: "15 minutes ago" },
    { user: "Carol White", action: "uploaded", document: "Market Analysis Report", time: "1 hour ago" },
    { user: "David Brown", action: "shared", document: "Legal Framework Overview", time: "2 hours ago" },
  ];

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
      
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs flex items-center gap-1 ${
                  stat.trend === "up" ? "text-green-500" : "text-red-500"
                }`}>
                  <TrendingUpIcon className={`h-3 w-3 ${stat.trend === "down" ? "rotate-180" : ""}`} />
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Documents</CardTitle>
              <CardDescription>Most viewed and downloaded documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topDocuments.map((doc, index) => (
                  <div key={doc.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.views} views • {doc.downloads} downloads
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest user actions in the data room</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                      <BarChartIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user}</span>{" "}
                        {activity.action}{" "}
                        <span className="font-medium">{activity.document}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}
