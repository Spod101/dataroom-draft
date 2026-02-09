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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { SearchBar } from "@/components/dataroom/search-bar";
import { 
  MoreHorizontalIcon, 
  HomeIcon, 
  FolderIcon,
  FileTextIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "lucide-react";

// Users data
const usersData = {
  haveAccess: [
    { id: "1", name: "Emily Grace Thompson", role: "Admin", avatar: "/avatars/emily.jpg" },
    { id: "2", name: "Oliver Michael Robinson", role: "Editor", avatar: "/avatars/oliver.jpg" },
    { id: "3", name: "Lucas Daniel Turner", role: "Viewer", avatar: "/avatars/lucas.jpg" },
  ],
  dontHaveAccess: [
    { id: "4", name: "Ava Marie Martinez", role: "Pending", avatar: "/avatars/ava.jpg" },
    { id: "5", name: "Olivia Claire Williams", role: "Pending", avatar: "/avatars/olivia.jpg" },
    { id: "6", name: "Emma Grace Carter", role: "Pending", avatar: "/avatars/emma.jpg" },
    { id: "7", name: "Jackson Andrew Davis", role: "Pending", avatar: "/avatars/jackson.jpg" },
    { id: "8", name: "Liam Christopher Miller", role: "Pending", avatar: "/avatars/liam.jpg" },
    { id: "9", name: "Ethan James Smith", role: "Pending", avatar: "/avatars/ethan.jpg" },
  ]
};

type PermissionSet = Record<string, { view: boolean; save: boolean; upload: boolean }>;

// Default permissions per user (simulating different access levels)
const defaultUserPermissions: Record<string, PermissionSet> = {
  // Admin - full access
  "1": {
    "home": { view: true, save: true, upload: true },
    "company-profile": { view: true, save: true, upload: true },
    "long-version": { view: true, save: true, upload: true },
    "deck": { view: true, save: true, upload: true },
    "catalog": { view: true, save: true, upload: true },
    "presentation": { view: true, save: true, upload: true },
    "financial-info": { view: true, save: true, upload: true },
    "contracts": { view: true, save: true, upload: true },
    "industry-background": { view: true, save: true, upload: true },
    "human-resources": { view: true, save: true, upload: true },
    "cv": { view: true, save: true, upload: true },
    "intellectual-property": { view: true, save: true, upload: true },
    "specific-industry": { view: true, save: true, upload: true },
    "contact-us": { view: true, save: true, upload: true },
  },
  // Editor - view and save, limited upload
  "2": {
    "home": { view: true, save: true, upload: false },
    "company-profile": { view: true, save: true, upload: false },
    "long-version": { view: true, save: true, upload: false },
    "deck": { view: true, save: true, upload: false },
    "catalog": { view: true, save: true, upload: false },
    "presentation": { view: true, save: true, upload: false },
    "financial-info": { view: true, save: false, upload: false },
    "contracts": { view: true, save: false, upload: false },
    "industry-background": { view: true, save: true, upload: false },
    "human-resources": { view: true, save: true, upload: true },
    "cv": { view: true, save: true, upload: true },
    "intellectual-property": { view: true, save: false, upload: false },
    "specific-industry": { view: true, save: true, upload: false },
    "contact-us": { view: true, save: true, upload: false },
  },
  // Viewer - view only
  "3": {
    "home": { view: true, save: false, upload: false },
    "company-profile": { view: true, save: false, upload: false },
    "long-version": { view: true, save: false, upload: false },
    "deck": { view: true, save: false, upload: false },
    "catalog": { view: true, save: false, upload: false },
    "presentation": { view: true, save: false, upload: false },
    "financial-info": { view: false, save: false, upload: false },
    "contracts": { view: false, save: false, upload: false },
    "industry-background": { view: true, save: false, upload: false },
    "human-resources": { view: false, save: false, upload: false },
    "cv": { view: false, save: false, upload: false },
    "intellectual-property": { view: false, save: false, upload: false },
    "specific-industry": { view: true, save: false, upload: false },
    "contact-us": { view: true, save: false, upload: false },
  },
  // Pending users - no access
  "4": {
    "home": { view: false, save: false, upload: false },
    "company-profile": { view: false, save: false, upload: false },
    "long-version": { view: false, save: false, upload: false },
    "deck": { view: false, save: false, upload: false },
    "catalog": { view: false, save: false, upload: false },
    "presentation": { view: false, save: false, upload: false },
    "financial-info": { view: false, save: false, upload: false },
    "contracts": { view: false, save: false, upload: false },
    "industry-background": { view: false, save: false, upload: false },
    "human-resources": { view: false, save: false, upload: false },
    "cv": { view: false, save: false, upload: false },
    "intellectual-property": { view: false, save: false, upload: false },
    "specific-industry": { view: false, save: false, upload: false },
    "contact-us": { view: false, save: false, upload: false },
  },
  "5": {
    "home": { view: false, save: false, upload: false },
    "company-profile": { view: false, save: false, upload: false },
    "long-version": { view: false, save: false, upload: false },
    "deck": { view: false, save: false, upload: false },
    "catalog": { view: false, save: false, upload: false },
    "presentation": { view: false, save: false, upload: false },
    "financial-info": { view: false, save: false, upload: false },
    "contracts": { view: false, save: false, upload: false },
    "industry-background": { view: false, save: false, upload: false },
    "human-resources": { view: false, save: false, upload: false },
    "cv": { view: false, save: false, upload: false },
    "intellectual-property": { view: false, save: false, upload: false },
    "specific-industry": { view: false, save: false, upload: false },
    "contact-us": { view: false, save: false, upload: false },
  },
  "6": {
    "home": { view: false, save: false, upload: false },
    "company-profile": { view: false, save: false, upload: false },
    "long-version": { view: false, save: false, upload: false },
    "deck": { view: false, save: false, upload: false },
    "catalog": { view: false, save: false, upload: false },
    "presentation": { view: false, save: false, upload: false },
    "financial-info": { view: false, save: false, upload: false },
    "contracts": { view: false, save: false, upload: false },
    "industry-background": { view: false, save: false, upload: false },
    "human-resources": { view: false, save: false, upload: false },
    "cv": { view: false, save: false, upload: false },
    "intellectual-property": { view: false, save: false, upload: false },
    "specific-industry": { view: false, save: false, upload: false },
    "contact-us": { view: false, save: false, upload: false },
  },
  "7": {
    "home": { view: false, save: false, upload: false },
    "company-profile": { view: false, save: false, upload: false },
    "long-version": { view: false, save: false, upload: false },
    "deck": { view: false, save: false, upload: false },
    "catalog": { view: false, save: false, upload: false },
    "presentation": { view: false, save: false, upload: false },
    "financial-info": { view: false, save: false, upload: false },
    "contracts": { view: false, save: false, upload: false },
    "industry-background": { view: false, save: false, upload: false },
    "human-resources": { view: false, save: false, upload: false },
    "cv": { view: false, save: false, upload: false },
    "intellectual-property": { view: false, save: false, upload: false },
    "specific-industry": { view: false, save: false, upload: false },
    "contact-us": { view: false, save: false, upload: false },
  },
  "8": {
    "home": { view: false, save: false, upload: false },
    "company-profile": { view: false, save: false, upload: false },
    "long-version": { view: false, save: false, upload: false },
    "deck": { view: false, save: false, upload: false },
    "catalog": { view: false, save: false, upload: false },
    "presentation": { view: false, save: false, upload: false },
    "financial-info": { view: false, save: false, upload: false },
    "contracts": { view: false, save: false, upload: false },
    "industry-background": { view: false, save: false, upload: false },
    "human-resources": { view: false, save: false, upload: false },
    "cv": { view: false, save: false, upload: false },
    "intellectual-property": { view: false, save: false, upload: false },
    "specific-industry": { view: false, save: false, upload: false },
    "contact-us": { view: false, save: false, upload: false },
  },
  "9": {
    "home": { view: false, save: false, upload: false },
    "company-profile": { view: false, save: false, upload: false },
    "long-version": { view: false, save: false, upload: false },
    "deck": { view: false, save: false, upload: false },
    "catalog": { view: false, save: false, upload: false },
    "presentation": { view: false, save: false, upload: false },
    "financial-info": { view: false, save: false, upload: false },
    "contracts": { view: false, save: false, upload: false },
    "industry-background": { view: false, save: false, upload: false },
    "human-resources": { view: false, save: false, upload: false },
    "cv": { view: false, save: false, upload: false },
    "intellectual-property": { view: false, save: false, upload: false },
    "specific-industry": { view: false, save: false, upload: false },
    "contact-us": { view: false, save: false, upload: false },
  },
};

// Files/Folders data structure
const filesStructure = [
  { 
    id: "home", 
    name: "Home", 
    type: "home",
    permissions: { view: true, save: true, upload: true },
  },
  { 
    id: "company-profile", 
    name: "Company Profile", 
    type: "folder",
    permissions: { view: true, save: true, upload: false },
    children: [
      { id: "long-version", name: "Long Version (PDF)", type: "file", permissions: { view: true, save: false, upload: false } },
      { id: "deck", name: "Deck (Presentation)", type: "file", permissions: { view: true, save: false, upload: false } },
    ]
  },
  { 
    id: "catalog", 
    name: "Catalog", 
    type: "folder",
    permissions: { view: true, save: false, upload: false },
    children: [
      { id: "presentation", name: "Presentation", type: "file", permissions: { view: true, save: false, upload: false } },
      { id: "financial-info", name: "Financial Information", type: "file", permissions: { view: true, save: false, upload: false } },
      { id: "contracts", name: "Contracts", type: "file", permissions: { view: true, save: false, upload: false } },
      { id: "industry-background", name: "Industry Background", type: "file", permissions: { view: true, save: false, upload: false } },
      { 
        id: "human-resources", 
        name: "Human Resources", 
        type: "folder",
        permissions: { view: true, save: false, upload: false },
        children: [
          { id: "cv", name: "JasonMcScot_CV.pdf", type: "file", permissions: { view: true, save: true, upload: true } },
        ]
      },
      { id: "intellectual-property", name: "Intellectual Property", type: "file", permissions: { view: true, save: false, upload: false } },
    ]
  },
  { 
    id: "specific-industry", 
    name: "Specific Industry", 
    type: "folder",
    permissions: { view: true, save: false, upload: false },
  },
  { 
    id: "contact-us", 
    name: "Contact Us", 
    type: "folder",
    permissions: { view: true, save: false, upload: false },
  },
];

export default function PermissionsPage() {
  const [selectedUser, setSelectedUser] = React.useState(usersData.haveAccess[0]);
  const [searchUser, setSearchUser] = React.useState("");
  const [searchFile, setSearchFile] = React.useState("");
  const [expandedFolders, setExpandedFolders] = React.useState<string[]>(["catalog", "human-resources"]);
  
  // Store all user permissions - keyed by user ID
  const [allUserPermissions, setAllUserPermissions] = React.useState<Record<string, PermissionSet>>(defaultUserPermissions);

  // Get current user's permissions
  const currentPermissions = allUserPermissions[selectedUser.id] || {};

  const handleSelectUser = (user: typeof usersData.haveAccess[0]) => {
    setSelectedUser(user);
  };

  const togglePermission = (itemId: string, permissionType: "view" | "save" | "upload") => {
    setAllUserPermissions(prev => ({
      ...prev,
      [selectedUser.id]: {
        ...prev[selectedUser.id],
        [itemId]: {
          ...prev[selectedUser.id]?.[itemId],
          [permissionType]: !prev[selectedUser.id]?.[itemId]?.[permissionType]
        }
      }
    }));
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const renderFileRow = (item: any, level: number = 0) => {
    const isExpanded = expandedFolders.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const itemPermissions = currentPermissions[item.id] || { view: false, save: false, upload: false };
    
    return (
      <React.Fragment key={item.id}>
        <div 
          className={`flex items-center py-2 px-3 hover:bg-accent/50 transition-colors ${
            level > 0 ? 'border-l border-muted ml-4' : ''
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
        >
          {/* Expand/Collapse button */}
          <div className="w-6 flex-shrink-0">
            {hasChildren && (
              <button 
                onClick={() => toggleFolder(item.id)}
                className="p-0.5 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          {/* Icon */}
          <div className="w-6 flex-shrink-0">
            {item.type === "home" ? (
              <HomeIcon className="h-4 w-4 text-muted-foreground" />
            ) : item.type === "folder" ? (
              <FolderIcon className="h-4 w-4 text-primary" />
            ) : (
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Name */}
          <span className="flex-1 text-sm truncate ml-2">{item.name}</span>

          {/* Permissions toggles */}
          <div className="flex items-center gap-6 pr-2">
            <Switch 
              checked={itemPermissions.view}
              onCheckedChange={() => togglePermission(item.id, "view")}
              className="data-[state=checked]:bg-primary"
            />
            <Switch 
              checked={itemPermissions.save}
              onCheckedChange={() => togglePermission(item.id, "save")}
              className="data-[state=checked]:bg-primary"
            />
            <Switch 
              checked={itemPermissions.upload}
              onCheckedChange={() => togglePermission(item.id, "upload")}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {item.children.map((child: any) => renderFileRow(child, level + 1))}
          </div>
        )}
      </React.Fragment>
    );
  };

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
      </header>
      
      <div className="flex flex-1 p-4 md:p-6 gap-4">
        {/* Left Panel - Users */}
        <Card className="w-[400px] flex-shrink-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Users</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Search */}
            <div className="px-4 pb-3">
              <SearchBar
                placeholder="Search User"
                value={searchUser}
                onSearch={setSearchUser}
                variant="compact"
              />
            </div>

            {/* Have Access Section */}
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground">Have access</p>
            </div>
            <div className="space-y-1 px-2">
              {usersData.haveAccess.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedUser.id === user.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className={selectedUser.id === user.id ? 'bg-primary-foreground text-primary' : ''}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className={`text-xs truncate ${
                      selectedUser.id === user.id 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>{user.role}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Don't Have Access Section */}
            <div className="px-4 py-2 mt-4">
              <p className="text-xs text-muted-foreground">Don&apos;t have access</p>
            </div>
            <div className="space-y-1 px-2 flex-1 overflow-auto">
              {usersData.dontHaveAccess.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedUser.id === user.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className={selectedUser.id === user.id ? 'bg-primary-foreground text-primary' : ''}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className={`text-xs truncate ${
                      selectedUser.id === user.id 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>{user.role}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Files */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Files</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Search */}
            <div className="px-4 pb-3">
              <SearchBar
                placeholder="Search Folder / File"
                value={searchFile}
                onSearch={setSearchFile}
                variant="compact"
              />
            </div>

            {/* Column Headers */}
            <div className="flex items-center py-2 px-4 border-b text-sm text-muted-foreground bg-muted/30">
              <span className="flex-1">Permissions</span>
              <div className="flex items-center gap-6 pr-2">
                <span className="w-[44px] text-center">View</span>
                <span className="w-[44px] text-center">Save</span>
                <span className="w-[44px] text-center">Upload</span>
              </div>
            </div>

            {/* Files Tree */}
            <div className="flex-1 overflow-auto">
              {filesStructure.map((item) => renderFileRow(item))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
