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
  LinkIcon,
  FileTextIcon,
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

// Industry-specific content structure
const industryStructure: Record<string, any> = {
  "education": {
    name: "Education",
    icon: "🎓",
    sectorType: "private-sector",
    items: [
      { name: "Catalog Link", type: "link", description: "Direct product links", modified: "Yesterday at 2:30 PM", modifiedBy: "Mae Ariale", size: "—", sharing: "Shared" },
      { name: "Presentation Deck", type: "file", description: "Education-specific deck", modified: "Yesterday at 11:15 AM", modifiedBy: "kirstendezaquino", size: "14.2 MB", sharing: "Shared" },
      { name: "Video Resources", type: "file", description: "Educational demos", modified: "Yesterday at 4:50 PM", modifiedBy: "Mae Ariale", size: "52.1 MB", sharing: "Shared" },
      { name: "Proposals", type: "folder", description: "Education-specific proposals", modified: "Yesterday at 3:25 PM", modifiedBy: "kirstendezaquino", size: "5 items", sharing: "Shared" },
    ]
  },
  "telecommunications": {
    name: "Telecommunications",
    icon: "📡",
    sectorType: "private-sector",
    items: [
      { name: "Catalog Link", type: "link", description: "Direct product links", modified: "Yesterday at 1:45 PM", modifiedBy: "kirstendezaquino", size: "—", sharing: "Shared" },
      { name: "Presentation Deck", type: "file", description: "Telecom-specific deck", modified: "Yesterday at 10:20 AM", modifiedBy: "Mae Ariale", size: "16.8 MB", sharing: "Shared" },
      { name: "Video Resources", type: "file", description: "Telecom demos", modified: "Yesterday at 5:30 PM", modifiedBy: "kirstendezaquino", size: "48.3 MB", sharing: "Shared" },
      { name: "Proposals", type: "folder", description: "Telecom-specific proposals", modified: "Yesterday at 2:55 PM", modifiedBy: "Mae Ariale", size: "6 items", sharing: "Shared" },
    ]
  },
  "other-industries": {
    name: "Other Industries",
    icon: "🏭",
    sectorType: "private-sector",
    items: [
      { name: "Catalog Link", type: "link", description: "Direct product links", modified: "Yesterday at 12:30 PM", modifiedBy: "Mae Ariale", size: "—", sharing: "Shared" },
      { name: "Presentation Deck", type: "file", description: "Industry-specific deck", modified: "Yesterday at 9:45 AM", modifiedBy: "kirstendezaquino", size: "13.5 MB", sharing: "Shared" },
      { name: "Video Resources", type: "file", description: "Product demos", modified: "Yesterday at 4:15 PM", modifiedBy: "Mae Ariale", size: "39.7 MB", sharing: "Shared" },
      { name: "Proposals", type: "folder", description: "Industry-specific proposals", modified: "Yesterday at 1:40 PM", modifiedBy: "kirstendezaquino", size: "4 items", sharing: "Shared" },
    ]
  },
  "government-agencies": {
    name: "Government Agencies",
    icon: "🏛️",
    sectorType: "lgu",
    items: [
      { name: "Catalog Link", type: "link", description: "Direct product links", modified: "Yesterday at 3:10 PM", modifiedBy: "kirstendezaquino", size: "—", sharing: "Shared" },
      { name: "Presentation Deck", type: "file", description: "Government-specific deck", modified: "Yesterday at 11:55 AM", modifiedBy: "Mae Ariale", size: "17.3 MB", sharing: "Shared" },
      { name: "Video Resources", type: "file", description: "Government demos", modified: "Yesterday at 5:05 PM", modifiedBy: "kirstendezaquino", size: "61.8 MB", sharing: "Shared" },
      { name: "Proposals", type: "folder", description: "Government-specific proposals", modified: "Yesterday at 2:20 PM", modifiedBy: "Mae Ariale", size: "7 items", sharing: "Shared" },
    ]
  },
  "education-lgu": {
    name: "Education (LGU)",
    icon: "🎓",
    sectorType: "lgu",
    items: [
      { name: "Catalog Link", type: "link", description: "Direct product links", modified: "Yesterday at 1:25 PM", modifiedBy: "Mae Ariale", size: "—", sharing: "Shared" },
      { name: "Presentation Deck", type: "file", description: "LGU Education deck", modified: "Yesterday at 10:40 AM", modifiedBy: "kirstendezaquino", size: "15.1 MB", sharing: "Shared" },
      { name: "Video Resources", type: "file", description: "Educational demos", modified: "Yesterday at 4:35 PM", modifiedBy: "Mae Ariale", size: "54.9 MB", sharing: "Shared" },
      { name: "Proposals", type: "folder", description: "LGU Education proposals", modified: "Yesterday at 3:00 PM", modifiedBy: "kirstendezaquino", size: "5 items", sharing: "Shared" },
    ]
  },
  "other-lgu": {
    name: "Other LGU Sectors",
    icon: "🏢",
    sectorType: "lgu",
    items: [
      { name: "Catalog Link", type: "link", description: "Direct product links", modified: "Yesterday at 2:15 PM", modifiedBy: "kirstendezaquino", size: "—", sharing: "Shared" },
      { name: "Presentation Deck", type: "file", description: "LGU-specific deck", modified: "Yesterday at 9:30 AM", modifiedBy: "Mae Ariale", size: "12.7 MB", sharing: "Shared" },
      { name: "Video Resources", type: "file", description: "Product demos", modified: "Yesterday at 5:20 PM", modifiedBy: "kirstendezaquino", size: "43.2 MB", sharing: "Shared" },
      { name: "Proposals", type: "folder", description: "LGU-specific proposals", modified: "Yesterday at 1:50 PM", modifiedBy: "Mae Ariale", size: "4 items", sharing: "Shared" },
    ]
  }
};

// Helper function to get icon based on item type
const getItemIcon = (item: any, size: "sm" | "lg" = "lg") => {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-10 w-10";
  if (item.type === "folder") {
    return <FolderIcon className={`${sizeClass} text-primary`} />;
  } else if (item.type === "link") {
    return <LinkIcon className={`${sizeClass} text-blue-500`} />;
  } else {
    // file type
    return <FileTextIcon className={`${sizeClass} text-muted-foreground`} />;
  }
};

const sectorNames: Record<string, string> = {
  "private-sector": "Private Sector",
  "lgu": "LGU"
};

export default function IndustryPage() {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const params = useParams();
  const folderSlug = params.folder as string;
  const subfolderSlug = params.subfolder as string;
  const industrySlug = params.industry as string;
  const industry = industryStructure[industrySlug];

  if (!industry) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Industry not found</p>
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
                <Link href="/dataroom/specific-industry">Specific Industry</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/dataroom/specific-industry/${subfolderSlug}`}>
                  {sectorNames[subfolderSlug] || subfolderSlug}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{industry.name}</BreadcrumbPage>
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

        {/* Industry Content Display */}
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
                  {industry.items.map((item: any, index: number) => (
                    <TableRow 
                      key={index}
                      className="cursor-pointer hover:bg-primary/5 group"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {getItemIcon(item, "sm")}
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
                              {item.type === "link" ? "Edit Link" : "Rename"}
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
              {industry.items.map((item: any, index: number) => (
                <Card 
                  key={index}
                  className="group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden border-primary/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 h-full flex flex-col relative">
                    <div className="flex items-start justify-between mb-4">
                      {getItemIcon(item)}
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
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
                          {item.type === "link" ? "Edit Link" : "Rename"}
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
                  </div>
                  <div className="mt-auto">
                    <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              ))}

              {/* Upload Card */}
              <Card className="group hover:shadow-lg hover:shadow-primary/20 hover:border-primary transition-all cursor-pointer relative overflow-hidden border-2 border-dashed border-primary/40 bg-primary/5">
                <CardContent className="p-6 h-full flex flex-col items-center justify-center min-h-[180px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 group-hover:scale-110 transition-all">
                      <PlusIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-base mb-1 text-primary">Upload File</h3>
                      <p className="text-xs text-muted-foreground">Add new resource</p>
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
