import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderIcon, FileIcon, UploadIcon, SearchIcon, MoreVerticalIcon } from "lucide-react";

export default function DataRoomPage() {
  const folders = [
    { name: "Financial Documents", files: 24, modified: "2 days ago" },
    { name: "Legal Contracts", files: 12, modified: "1 week ago" },
    { name: "Technical Specs", files: 8, modified: "3 days ago" },
    { name: "Marketing Materials", files: 15, modified: "5 days ago" },
  ];

  const recentFiles = [
    { name: "Q4_Financial_Report.pdf", size: "2.4 MB", modified: "1 hour ago" },
    { name: "NDA_Template.docx", size: "156 KB", modified: "3 hours ago" },
    { name: "Product_Roadmap.xlsx", size: "892 KB", modified: "Yesterday" },
  ];

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Data Room</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm">
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search files and folders..."
              className="pl-8 w-full"
            />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Folders</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {folders.map((folder) => (
              <Card key={folder.name} className="hover:bg-accent cursor-pointer transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <FolderIcon className="h-4 w-4 inline-block mr-2 text-primary" />
                    {folder.name}
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVerticalIcon className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {folder.files} files • {folder.modified}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Recent Files</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-4 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.size} • {file.modified}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVerticalIcon className="h-4 w-4" />
                    </Button>
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
