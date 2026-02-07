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
  LinkIcon as LinkIconLucide,
  FolderIcon,
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

// Folder structure definition
const folderStructure: Record<string, any> = {
  "company-profile": {
    name: "Company Profile",
    icon: "🏢",
    items: [
      { name: "Long Version (PDF)", type: "file", description: "Full Company Profile", modified: "Yesterday at 10:23 AM", modifiedBy: "kirstendezaquino", size: "18.9 MB", sharing: "Shared" },
      { name: "Deck (Presentation)", type: "file", description: "Canva/PDF presentation", modified: "Yesterday at 11:45 AM", modifiedBy: "kirstendezaquino", size: "12.5 MB", sharing: "Shared" },
      { name: "Short One-Pager (PDF)", type: "file", description: "Summary version", modified: "Yesterday at 2:15 PM", modifiedBy: "Mae Ariale", size: "3.2 MB", sharing: "Shared" },
      { name: "Videos", type: "file", description: "Company Overview, Highlights", modified: "Yesterday at 9:30 AM", modifiedBy: "kirstendezaquino", size: "45.7 MB", sharing: "Shared" },
      { name: "Proposal (Staff Augmentation)", type: "file", description: "PDF proposal", modified: "Yesterday at 4:55 PM", modifiedBy: "Mae Ariale", size: "8.1 MB", sharing: "Shared" },
    ]
  },
  "catalog": {
    name: "Catalog",
    icon: "📚",
    items: [
      { name: "Product Link", type: "link", description: "Direct link to product/service info", modified: "Yesterday at 3:20 PM", modifiedBy: "Mae Ariale", size: "—", sharing: "Shared" },
      { name: "Presentation Deck", type: "file", description: "Product presentation", modified: "Yesterday at 1:10 PM", modifiedBy: "kirstendezaquino", size: "15.3 MB", sharing: "Shared" },
      { name: "Product Videos", type: "file", description: "Product demos", modified: "Yesterday at 5:40 PM", modifiedBy: "Mae Ariale", size: "67.2 MB", sharing: "Shared" },
    ]
  },
  "specific-industry": {
    name: "Specific Industry",
    icon: "🏭",
    items: [
      { name: "Private Sector", type: "folder", slug: "private-sector", modified: "Yesterday at 5:52 PM", modifiedBy: "Mae Ariale", size: "3 items", sharing: "Shared" },
      { name: "LGU", type: "folder", slug: "lgu", modified: "Yesterday at 5:53 PM", modifiedBy: "Mae Ariale", size: "3 items", sharing: "Shared" },
    ]
  },
  "contact-us": {
    name: "Contact Us",
    icon: "📧",
    items: [
      { name: "Data Room Admin Info", type: "file", description: "HSI Contact Information", modified: "Yesterday at 6:01 PM", modifiedBy: "Mae Ariale", size: "1.2 MB", sharing: "Shared" },
    ]
  }
};

// Helper function to get icon based on item type
const getItemIcon = (item: any, size: "sm" | "lg" = "lg") => {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-10 w-10";
  if (item.type === "folder") {
    return <FolderIcon className={`${sizeClass} text-primary`} />;
  } else if (item.type === "link") {
    return <LinkIconLucide className={`${sizeClass} text-blue-500`} />;
  } else {
    // file type
    return <FileTextIcon className={`${sizeClass} text-muted-foreground`} />;
  }
};

export default function FolderPage() {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const params = useParams();
  const folderSlug = params.folder as string;
  const folder = folderStructure[folderSlug];

  if (!folder) {
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
              <BreadcrumbPage>{folder.name}</BreadcrumbPage>
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

        {/* Items Display */}
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
                  {folder.items.map((item: any, index: number) => (
                    <TableRow 
                      key={index}
                      className="cursor-pointer hover:bg-primary/5 group"
                      onClick={() => item.type === "folder" && (window.location.href = `/dataroom/${folderSlug}/${item.slug}`)}
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
            {folder.items.map((item: any, index: number) => {
              const cardContent = item.type === "folder" ? (
                <Link key={index} href={`/dataroom/${folderSlug}/${item.slug}`}>
                  <Card className={`group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden border-primary/20 ${viewMode === "grid" ? "h-full" : ""}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className={viewMode === "grid" ? "p-6 h-full flex flex-col relative" : "p-4 flex items-center gap-4 relative"}>
                      {viewMode === "grid" ? (
                        <>
                          <div className="flex items-start justify-between mb-4">
                            {getItemIcon(item)}
                            <FolderIcon className="h-5 w-5 text-primary/40" />
                          </div>
                          <div className="mt-auto">
                            <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors">{item.name}</h3>
                          </div>
                        </>
                      ) : (
                        <>
                          {getItemIcon(item)}
                          <div className="flex-1">
                            <h3 className="font-semibold text-base group-hover:text-primary transition-colors">{item.name}</h3>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card 
                  key={index}
                  className={`group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden border-primary/20 ${viewMode === "grid" ? "h-full" : ""}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className={viewMode === "grid" ? "p-6 h-full flex flex-col relative" : "p-4 flex items-center gap-4 relative"}>
                    {viewMode === "grid" ? (
                      <>
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
                        </div>
                        <div className="mt-auto">
                          <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{item.name}</h3>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {getItemIcon(item)}
                        <div className="flex-1">
                          <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{item.name}</h3>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
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
                      </>
                    )}
                  </CardContent>
                </Card>
              );
              return cardContent;
            })}

            {/* Upload/Add New Card */}
            <Card className="group hover:shadow-lg hover:shadow-primary/20 hover:border-primary transition-all cursor-pointer relative overflow-hidden border-2 border-dashed border-primary/40 bg-primary/5">
              <CardContent className="p-6 h-full flex flex-col items-center justify-center min-h-[180px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 group-hover:scale-110 transition-all">
                    <PlusIcon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-base mb-1 text-primary">Upload File</h3>
                    <p className="text-xs text-muted-foreground">Add new file or document</p>
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
