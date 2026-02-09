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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchBar } from "@/components/dataroom/search-bar";
import { 
  HomeIcon, 
  FolderIcon,
  FileTextIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  UsersIcon,
  SaveIcon,
  ClockIcon,
  LinkIcon,
} from "lucide-react";

// Files/Folders data structure for the tree - matching Data Room structure
const filesStructure = [
  { 
    id: "home", 
    name: "Home", 
    type: "home",
  },
  { 
    id: "company-profile", 
    name: "Company Profile", 
    type: "folder",
    children: [
      { id: "long-version", name: "Long Version (PDF)", type: "file" },
      { id: "deck-presentation", name: "Deck (Presentation)", type: "file" },
      { id: "short-one-pager", name: "Short One-Pager (PDF)", type: "file" },
      { id: "videos", name: "Videos", type: "file" },
      { id: "proposal", name: "Proposal (Staff Augmentation)", type: "file" },
    ]
  },
  { 
    id: "catalog", 
    name: "Catalog", 
    type: "folder",
    children: [
      { id: "product-link", name: "Product Link", type: "link" },
      { id: "presentation-deck", name: "Presentation Deck", type: "file" },
      { id: "product-videos", name: "Product Videos", type: "file" },
    ]
  },
  { 
    id: "specific-industry", 
    name: "Specific Industry", 
    type: "folder",
    children: [
      { 
        id: "private-sector", 
        name: "Private Sector", 
        type: "folder",
        children: [
          { 
            id: "education", 
            name: "Education", 
            type: "folder",
            children: [
              { id: "edu-catalog", name: "Catalog", type: "folder" },
              { id: "edu-proposals", name: "Proposals", type: "file" },
            ]
          },
          { 
            id: "telecommunications", 
            name: "Telecommunications", 
            type: "folder",
            children: [
              { id: "telecom-catalog", name: "Catalog", type: "folder" },
              { id: "telecom-proposals", name: "Proposals", type: "file" },
            ]
          },
        ]
      },
      { 
        id: "lgu", 
        name: "LGU", 
        type: "folder",
        children: [
          { 
            id: "government", 
            name: "Government Agencies", 
            type: "folder",
            children: [
              { id: "gov-catalog", name: "Catalog", type: "folder" },
              { id: "gov-proposals", name: "Proposals", type: "file" },
            ]
          },
          { 
            id: "lgu-education", 
            name: "Education (LGU)", 
            type: "folder",
            children: [
              { id: "lgu-edu-catalog", name: "Catalog", type: "folder" },
              { id: "lgu-edu-proposals", name: "Proposals", type: "file" },
            ]
          },
        ]
      },
    ]
  },
  { 
    id: "contact-us", 
    name: "Contact Us", 
    type: "folder",
    children: [
      { id: "admin-info", name: "Data Room Admin Info", type: "file" },
    ]
  },
];

// User activity data
const userActivity = [
  { 
    id: "1", 
    name: "Emily Grace Thompson", 
    company: "Quantum Ventures", 
    avatar: "/avatars/emily.jpg",
    views: 45,
    totalTimeSpend: "21:41 min",
    saved: true
  },
  { 
    id: "2", 
    name: "Oliver Michael Robinson", 
    company: "EcoSolutions Capital", 
    avatar: "/avatars/oliver.jpg",
    views: 27,
    totalTimeSpend: "10:00 min",
    saved: false
  },
  { 
    id: "3", 
    name: "Lucas Daniel Turner", 
    company: "RoboRevolution Partners", 
    avatar: "/avatars/lucas.jpg",
    views: 11,
    totalTimeSpend: "03:27 min",
    saved: false
  },
];

// Chart data points (simulated)
const chartData = [
  10, 15, 12, 18, 22, 20, 25, 28, 24, 30, 26, 32, 28, 35, 30, 38, 34, 40, 36, 42
];

export default function InsightsPage() {
  const [searchFile, setSearchFile] = React.useState("");
  const [searchUser, setSearchUser] = React.useState("");
  const [expandedFolders, setExpandedFolders] = React.useState<string[]>(["company-profile", "catalog"]);
  const [selectedFile, setSelectedFile] = React.useState<string>("long-version");

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
    const isSelected = selectedFile === item.id;
    
    return (
      <React.Fragment key={item.id}>
        <div 
          onClick={() => setSelectedFile(item.id)}
          className={`flex items-center py-2 px-3 cursor-pointer transition-colors ${
            isSelected ? 'bg-primary text-primary-foreground rounded-lg' : 'hover:bg-accent/50'
          } ${level > 0 ? 'ml-4' : ''}`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {/* Expand/Collapse button */}
          <div className="w-5 flex-shrink-0">
            {hasChildren && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(item.id);
                }}
                className="p-0.5 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDownIcon className={`h-4 w-4 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                ) : (
                  <ChevronRightIcon className={`h-4 w-4 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                )}
              </button>
            )}
          </div>

          {/* Icon */}
          <div className="w-5 flex-shrink-0">
            {item.type === "home" ? (
              <HomeIcon className={`h-4 w-4 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            ) : item.type === "folder" ? (
              <FolderIcon className={`h-4 w-4 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
            ) : item.type === "link" ? (
              <LinkIcon className={`h-4 w-4 ${isSelected ? 'text-primary-foreground' : 'text-blue-500'}`} />
            ) : (
              <FileTextIcon className={`h-4 w-4 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            )}
          </div>

          {/* Name */}
          <span className="text-sm truncate ml-2">{item.name}</span>
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

  // Calculate chart path
  const maxValue = Math.max(...chartData);
  const chartWidth = 400;
  const chartHeight = 100;
  const pointSpacing = chartWidth / (chartData.length - 1);
  
  const pathPoints = chartData.map((value, index) => {
    const x = index * pointSpacing;
    const y = chartHeight - (value / maxValue) * chartHeight;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaPath = `${pathPoints} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

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
        {/* Left Panel - Files */}
        <Card className="w-[280px] flex-shrink-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Files</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Search */}
            <div className="px-4 pb-3">
              <SearchBar
                placeholder="Search File"
                value={searchFile}
                onSearch={setSearchFile}
                variant="compact"
              />
            </div>

            {/* Files Tree */}
            <div className="flex-1 overflow-auto px-2">
              {filesStructure.map((item) => renderFileRow(item))}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Analytics */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <UsersIcon className="h-4 w-4" />
                  <span>Users with access</span>
                </div>
                <p className="text-3xl font-bold">3</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <SaveIcon className="h-4 w-4" />
                  <span>Total Saves</span>
                </div>
                <p className="text-3xl font-bold">1</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>Total Time Spend</span>
                </div>
                <p className="text-3xl font-bold">46:41 min</p>
              </CardContent>
            </Card>
          </div>

          {/* Views Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[120px] w-full">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
                  {/* Gradient fill */}
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  {/* Area */}
                  <path d={areaPath} fill="url(#chartGradient)" />
                  {/* Line */}
                  <path d={pathPoints} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* User Activity Table */}
          <Card className="flex-1">
            <CardContent className="pt-4">
              {/* Search */}
              <div className="mb-4">
                <SearchBar
                  placeholder="Search User"
                  value={searchUser}
                  onSearch={setSearchUser}
                  variant="compact"
                />
              </div>

              {/* Table Header */}
              <div className="flex items-center py-2 px-2 text-sm text-muted-foreground border-b">
                <span className="flex-1">File Name</span>
                <span className="w-20 text-center">Views</span>
                <span className="w-28 text-center">Total Time Spend</span>
                <span className="w-16 text-center">Saved</span>
              </div>

              {/* User Rows */}
              <div className="divide-y">
                {userActivity.map((user) => (
                  <div key={user.id} className="flex items-center py-3 px-2">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.company}</p>
                      </div>
                    </div>
                    <span className="w-20 text-center text-sm">{user.views}</span>
                    <span className="w-28 text-center text-sm">{user.totalTimeSpend}</span>
                    <span className="w-16 text-center text-sm">{user.saved ? 'yes' : 'no'}</span>
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
