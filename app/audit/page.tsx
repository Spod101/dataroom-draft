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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/dataroom/search-bar";
import { FilterSelect } from "@/components/dataroom/filter-select";
import { DownloadButton } from "@/components/dataroom/download-button";
import { ChevronDownIcon } from "lucide-react";

// Members/Users data - same as permissions
const members = [
  { id: "1", name: "Emily Grace Thompson" },
  { id: "2", name: "Oliver Michael Robinson" },
  { id: "3", name: "Lucas Daniel Turner" },
  { id: "4", name: "Ava Marie Martinez" },
  { id: "5", name: "Sophia Olivia Hernandez" },
  { id: "6", name: "Benjamin Alexander Davis" },
];

// Action types
const actionTypes = [
  { id: "all", name: "All" },
  { id: "upload", name: "Upload" },
  { id: "create", name: "Create" },
  { id: "rename", name: "Rename" },
  { id: "access", name: "Access" },
  { id: "delete", name: "Delete" },
  { id: "download", name: "Download" },
];

// Users who can be affected
const usersAffected = [
  { id: "all", name: "All" },
  { id: "georges", name: "Georges Embolo" },
  { id: "lucas", name: "Lucas Miller" },
  { id: "noah", name: "Noah Smith" },
  { id: "mia", name: "Mia Wilson" },
  { id: "benjamin", name: "Benjamin Taylor" },
  { id: "emma", name: "Emma Martinez" },
];

// Audit log data - matching data room files
const auditLogs = [
  {
    id: 1,
    date: "19/08/2022",
    member: "Benjamin Alexander Davis",
    action: "Upload",
    description: 'Uploaded "Financialpromotion2023.pdf"',
    userAffected: null,
  },
  {
    id: 2,
    date: "05/12/2023",
    member: "Sophia Olivia Hernandez",
    action: "Create",
    description: 'Created Folder "Financial Promotion"',
    userAffected: null,
  },
  {
    id: 3,
    date: "18/09/2023",
    member: "Benjamin Alexander Davis",
    action: "Rename",
    description: 'Renamed Folder "HR" into "Human Resources"',
    userAffected: null,
  },
  {
    id: 4,
    date: "22/07/2023",
    member: "Emily Elizabeth Thompson",
    action: "Access",
    description: 'Give access to "report.pdf" to user Georges Embolo',
    userAffected: "Georges Embolo",
  },
  {
    id: 5,
    date: "22/07/2023",
    member: "Emily Elizabeth Thompson",
    action: "Access",
    description: 'Give access to "report.pdf" to user Lucas Miller',
    userAffected: "Lucas Miller",
  },
  {
    id: 6,
    date: "22/07/2023",
    member: "Emily Elizabeth Thompson",
    action: "Access",
    description: 'Give access to "report.pdf" to user Noah Smith',
    userAffected: "Noah Smith",
  },
  {
    id: 7,
    date: "22/07/2023",
    member: "Emily Elizabeth Thompson",
    action: "Access",
    description: 'Give access to "report.pdf" to user Mia Wilson',
    userAffected: "Mia Wilson",
  },
  {
    id: 8,
    date: "22/07/2023",
    member: "Emily Elizabeth Thompson",
    action: "Access",
    description: 'Give access to "report.pdf" to user Benjamin Taylor',
    userAffected: "Benjamin Taylor",
  },
  {
    id: 9,
    date: "22/07/2023",
    member: "Emily Elizabeth Thompson",
    action: "Access",
    description: 'Give access to "report.pdf" to user Emma Martinez',
    userAffected: "Emma Martinez",
  },
  {
    id: 10,
    date: "29/06/2023",
    member: "Sophia Olivia Hernandez",
    action: "Create",
    description: 'Created Folder "Financial Model"',
    userAffected: null,
  },
  {
    id: 11,
    date: "29/06/2023",
    member: "Sophia Olivia Hernandez",
    action: "Create",
    description: 'Created Folder "Industry Background"',
    userAffected: null,
  },
  {
    id: 12,
    date: "29/06/2023",
    member: "Sophia Olivia Hernandez",
    action: "Create",
    description: 'Created Folder "Presentation"',
    userAffected: null,
  },
  {
    id: 13,
    date: "29/06/2023",
    member: "Sophia Olivia Hernandez",
    action: "Create",
    description: 'Created Folder "Financial Information"',
    userAffected: null,
  },
  {
    id: 14,
    date: "29/06/2023",
    member: "Sophia Olivia Hernandez",
    action: "Create",
    description: 'Created Folder "Contracts"',
    userAffected: null,
  },
  {
    id: 15,
    date: "28/06/2023",
    member: "Benjamin Alexander Davis",
    action: "Upload",
    description: 'Uploaded "Company_Profile_2023.pdf"',
    userAffected: null,
  },
  {
    id: 16,
    date: "28/06/2023",
    member: "Benjamin Alexander Davis",
    action: "Upload",
    description: 'Uploaded "Product_Catalog.pdf"',
    userAffected: null,
  },
  {
    id: 17,
    date: "27/06/2023",
    member: "Oliver Michael Robinson",
    action: "Download",
    description: 'Downloaded "Long Version (PDF)"',
    userAffected: null,
  },
  {
    id: 18,
    date: "27/06/2023",
    member: "Lucas Daniel Turner",
    action: "Download",
    description: 'Downloaded "Deck (Presentation)"',
    userAffected: null,
  },
];

// Action badge styles
const getActionStyle = (action: string) => {
  switch (action.toLowerCase()) {
    case "upload":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "create":
      return "bg-green-100 text-green-700 border-green-200";
    case "rename":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "access":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "delete":
      return "bg-red-100 text-red-700 border-red-200";
    case "download":
      return "bg-cyan-100 text-cyan-700 border-cyan-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [memberFilter, setMemberFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [userAffectedFilter, setUserAffectedFilter] = React.useState("all");
  const [dateRange, setDateRange] = React.useState("11/01/2019 - 11/01/2024");

  // Filter logs based on selections
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.member.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMember = memberFilter === "all" || 
      log.member.toLowerCase().includes(memberFilter.toLowerCase());
    
    const matchesAction = actionFilter === "all" || 
      log.action.toLowerCase() === actionFilter.toLowerCase();
    
    const matchesUserAffected = userAffectedFilter === "all" || 
      (log.userAffected && log.userAffected.toLowerCase().includes(userAffectedFilter.toLowerCase()));

    return matchesSearch && matchesMember && matchesAction && (userAffectedFilter === "all" || matchesUserAffected);
  });

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Audit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Filters Row - same bubble style as Data Room controls */}
        <div className="bg-background rounded-xl border border-primary/20 shadow-sm p-3 hover:border-primary/40 transition-colors">
          <div className="flex flex-wrap items-center gap-3">
            {/* Members Filter */}
            <FilterSelect
              label="Members"
              value={memberFilter}
              onValueChange={setMemberFilter}
              options={[
                { id: "all", name: "All" },
                ...members.map(m => ({ id: m.name, name: m.name }))
              ]}
            />

            {/* Actions Filter */}
            <FilterSelect
              label="Actions"
              value={actionFilter}
              onValueChange={setActionFilter}
              options={actionTypes}
            />

            {/* Users Affected Filter */}
            <FilterSelect
              label="Users"
              value={userAffectedFilter}
              onValueChange={setUserAffectedFilter}
              options={usersAffected}
            />

            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Period</span>
              <Button variant="outline" size="sm" className="h-9 gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50">
                {dateRange}
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Download Button - same outline style as Data Room */}
            <div className="ml-auto">
              <DownloadButton showDropdown />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar
          placeholder="Search audit logs..."
          value={searchTerm}
          onSearch={setSearchTerm}
        />

        {/* Audit Table */}
        <Card className="border-primary/20 flex-1">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-[100px_1fr_100px_1fr_150px] gap-4 px-6 py-3 border-b bg-muted/30 text-sm text-muted-foreground">
              <div>Date</div>
              <div>Member</div>
              <div>Action</div>
              <div>Description</div>
              <div>User Affected</div>
            </div>

            {/* Table Body */}
            <div className="divide-y">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="grid grid-cols-[100px_1fr_100px_1fr_150px] gap-4 px-6 py-4 hover:bg-accent/50 transition-colors items-center"
                >
                  <div className="text-sm text-muted-foreground">{log.date}</div>
                  <div className="text-sm font-medium">{log.member}</div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionStyle(log.action)}`}>
                      {log.action}
                    </span>
                  </div>
                  <div className="text-sm">{log.description}</div>
                  <div className="text-sm text-primary">
                    {log.userAffected || <span className="text-muted-foreground">none</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredLogs.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                No audit logs found matching your filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
