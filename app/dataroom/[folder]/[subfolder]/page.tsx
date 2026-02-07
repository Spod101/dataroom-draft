"use client"

import * as React from "react"
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DataRoomControls } from "@/components/dataroom/dataroom-controls";
import { 
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  MoveIcon,
  TrashIcon,
  ShieldIcon,
  FolderIcon,
  UsersIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Subfolder structure
const subfolderStructure: Record<string, any> = {
  "private-sector": {
    name: "Private Sector",
    icon: "🏢",
    parent: "specific-industry",
    parentName: "Specific Industry",
    items: [
      { name: "Education", icon: "🎓", type: "folder", slug: "education", modified: "Yesterday at 4:20 PM", modifiedBy: "Mae Ariale", size: "4 items", sharing: "Shared" },
      { name: "Telecommunications", icon: "📡", type: "folder", slug: "telecommunications", modified: "Yesterday at 3:15 PM", modifiedBy: "kirstendezaquino", size: "4 items", sharing: "Shared" },
      { name: "Other Industries", icon: "🏭", type: "folder", slug: "other-industries", modified: "Yesterday at 2:45 PM", modifiedBy: "Mae Ariale", size: "4 items", sharing: "Shared" },
    ]
  },
  "lgu": {
    name: "LGU",
    icon: "🏛️",
    parent: "specific-industry",
    parentName: "Specific Industry",
    items: [
      { name: "Government Agencies", icon: "🏛️", type: "folder", slug: "government-agencies", modified: "Yesterday at 5:10 PM", modifiedBy: "Mae Ariale", size: "4 items", sharing: "Shared" },
      { name: "Education (LGU)", icon: "🎓", type: "folder", slug: "education-lgu", modified: "Yesterday at 4:35 PM", modifiedBy: "kirstendezaquino", size: "4 items", sharing: "Shared" },
      { name: "Other LGU Sectors", icon: "🏢", type: "folder", slug: "other-lgu", modified: "Yesterday at 3:50 PM", modifiedBy: "Mae Ariale", size: "4 items", sharing: "Shared" },
    ]
  }
};

export default function SubfolderPage() {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const params = useParams();
  const folderSlug = params.folder as string;
  const subfolderSlug = params.subfolder as string;
  const subfolder = subfolderStructure[subfolderSlug];

  if (!subfolder) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Folder not found</p>
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
              <BreadcrumbLink asChild>
                <Link href="/dataroom">Data Room</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/dataroom/${subfolder.parent}`}>{subfolder.parentName}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{subfolder.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      
      {/* Banner */}
      <div className="relative w-full h-48 md:h-64 lg:h-80 overflow-hidden border-b">
        <Image
          src="/banner.png"
          alt="Data Room Banner"
          fill
          className="object-cover"
          priority
        />
      </div>
      
      <div className="flex flex-1 flex-col p-6 gap-4">
        {/* Data Room Controls */}
        <DataRoomControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onDownload={() => console.log("Download clicked")}
        />

        {/* Industry Folders Display */}
        <div className="flex-1">
          {viewMode === "list" ? (
            /* Table View */
            <Card className="border-primary/20">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%]">Name</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead>Modified By</TableHead>
                    <TableHead>File size</TableHead>
                    <TableHead>Sharing</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subfolder.items.map((item: any, index: number) => (
                    <TableRow 
                      key={index}
                      className="cursor-pointer hover:bg-primary/5 group"
                      onClick={() => window.location.href = `/dataroom/${folderSlug}/${subfolderSlug}/${item.slug}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="group-hover:text-primary transition-colors">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.modified}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.modifiedBy}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.size}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <UsersIcon className="h-4 w-4" />
                          {item.sharing}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                            >
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary">
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary">
                              <MoveIcon className="h-4 w-4 mr-2" />
                              Move
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary">
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary">
                              <ShieldIcon className="h-4 w-4 mr-2" />
                              Permissions
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subfolder.items.map((item: any, index: number) => (
                <Link key={index} href={`/dataroom/${folderSlug}/${subfolderSlug}/${item.slug}`}>
                  <Card className="group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden border-primary/20 h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6 h-full flex flex-col relative">
                      <div className="flex items-start justify-between mb-4">
                        <FolderIcon className="h-10 w-10 text-primary" />
                        <FolderIcon className="h-5 w-5 text-primary/40" />
                      </div>
                      <div className="mt-auto">
                        <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors">{item.name}</h3>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {/* Add New Industry Card */}
              <Card className="group hover:shadow-lg hover:shadow-primary/20 hover:border-primary transition-all cursor-pointer relative overflow-hidden border-2 border-dashed border-primary/40 bg-primary/5">
                <CardContent className="p-6 h-full flex flex-col items-center justify-center min-h-[180px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 group-hover:scale-110 transition-all">
                      <PlusIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-base mb-1 text-primary">New Industry</h3>
                      <p className="text-xs text-muted-foreground">Add new industry folder</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </SidebarInset>
  );
}
