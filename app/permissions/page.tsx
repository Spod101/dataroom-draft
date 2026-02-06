import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlusIcon, ShieldCheckIcon, ShieldAlertIcon } from "lucide-react";

export default function PermissionsPage() {
  const users = [
    { name: "Alice Johnson", email: "alice@example.com", role: "Admin", access: "Full Access", status: "active" },
    { name: "Bob Smith", email: "bob@example.com", role: "Editor", access: "Read & Write", status: "active" },
    { name: "Carol White", email: "carol@example.com", role: "Viewer", access: "Read Only", status: "active" },
    { name: "David Brown", email: "david@example.com", role: "Editor", access: "Read & Write", status: "pending" },
  ];

  const accessLevels = [
    { level: "Full Access", users: 3, icon: ShieldCheckIcon, color: "text-green-500" },
    { level: "Read & Write", users: 8, icon: ShieldCheckIcon, color: "text-blue-500" },
    { level: "Read Only", users: 12, icon: ShieldAlertIcon, color: "text-yellow-500" },
  ];

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Permissions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto">
          <Button size="sm">
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {accessLevels.map((item) => (
            <Card key={item.level}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.level}</CardTitle>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.users}</div>
                <p className="text-xs text-muted-foreground">
                  {item.users === 1 ? "user" : "users"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Access Management</CardTitle>
            <CardDescription>Manage user permissions and access levels</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {users.map((user) => (
                <div
                  key={user.email}
                  className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`/avatar-${user.name.split(' ')[0].toLowerCase()}.jpg`} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={user.status === "active" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{user.access}</span>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
