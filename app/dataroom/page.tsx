"use client"

import * as React from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import Link from "next/link";
import { DataRoomControls } from "@/components/dataroom/dataroom-controls";
import { 
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  MoveIcon,
  TrashIcon,
  ShieldIcon,
  LinkIcon,
  FolderIcon,
  UsersIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DataRoomPage() {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  
  const folders = [
    { 
      name: "Company Profile", 
      icon: "🏢", 
      description: "Company information and overview", 
      slug: "company-profile",
      modified: "Yesterday at 5:53 PM",
      modifiedBy: "Mae Ariale",
      items: "5 items",
      sharing: "Shared"
    },
    { 
      name: "Catalog", 
      icon: "📚", 
      description: "Product and service catalog", 
      slug: "catalog",
      modified: "Yesterday at 5:54 PM",
      modifiedBy: "Mae Ariale",
      items: "6 items",
      sharing: "Shared"
    },
    { 
      name: "Specific Industry", 
      icon: "🏭", 
      description: "Industry-specific documents", 
      slug: "specific-industry",
      modified: "Yesterday at 5:52 PM",
      modifiedBy: "Mae Ariale",
      items: "3 items",
      sharing: "Shared"
    },
    { 
      name: "Contact Us", 
      icon: "📧", 
      description: "Contact information and support", 
      slug: "contact-us",
      modified: "Yesterday at 6:01 PM",
      modifiedBy: "Mae Ariale",
      items: "0 items",
      sharing: "Shared"
    },
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
          searchPlaceholder="Search file or folder"
          onDownload={() => console.log("Download clicked")}
        />

        {/* Folders Display */}
        <div className="flex-1">
          {viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {folders.map((folder) => (
                <Link key={folder.name} href={`/dataroom/${folder.slug}`}>
                  <Card 
                    className="group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden border-primary/20 h-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6 h-full flex flex-col relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="text-5xl">{folder.icon}</div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
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
                            <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary">
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-auto">
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{folder.name}</h3>
                        <p className="text-sm text-muted-foreground">{folder.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {/* New Folder Card - Grid */}
              <Card className="group hover:shadow-lg hover:shadow-primary/20 hover:border-primary transition-all cursor-pointer relative overflow-hidden border-2 border-dashed border-primary/40 bg-primary/5">
                <CardContent className="p-6 h-full flex flex-col items-center justify-center min-h-[180px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 group-hover:scale-110 transition-all">
                      <PlusIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg mb-1 text-primary">New Folder</h3>
                      <p className="text-sm text-muted-foreground">Create a new folder</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* List View - Table */
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
                  {folders.map((folder) => (
                    <TableRow 
                      key={folder.name}
                      className="cursor-pointer hover:bg-primary/5 group"
                      onClick={() => window.location.href = `/dataroom/${folder.slug}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="group-hover:text-primary transition-colors">{folder.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{folder.modified}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{folder.modifiedBy}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{folder.items}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <UsersIcon className="h-4 w-4" />
                          {folder.sharing}
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
                            <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary">
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </SidebarInset>
  );
}
