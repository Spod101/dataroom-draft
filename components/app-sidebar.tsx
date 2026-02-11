"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  FolderIcon,
  SettingsIcon,
  ShieldCheckIcon,
  BarChartIcon,
  BellIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
  Trash2Icon,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { DataRoomNav, AddNavigationButton } from "@/components/dataroom/data-room-nav"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"

const navMain = [
    {
      title: "Data Room",
      url: "/dataroom",
      icon: FolderIcon,
      isActive: true,
      adminOnly: false,
    },
    {
      title: "Permissions",
      url: "/permissions",
      icon: ShieldCheckIcon,
      adminOnly: true,
    },
    {
      title: "Insights",
      url: "/insights",
      icon: BarChartIcon,
      adminOnly: true,
    },
    {
      title: "Audit",
      url: "/audit",
      icon: ClipboardListIcon,
      adminOnly: true,
    },
    {
      title: "Trash",
      url: "/trash",
      icon: Trash2Icon,
      adminOnly: false,
    },
  ]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, profile, signOut } = useAuth()

  const displayName = profile?.name ?? user?.email?.split("@")[0] ?? "User"
  const displayEmail = user?.email ?? ""
  const isAdmin = profile?.role === "admin"

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  const isActive = (url: string) => {
    if (url === "/dataroom") {
      return pathname === url || pathname.startsWith("/dataroom")
    }
    return pathname === url || pathname.startsWith(url + "/")
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dataroom">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <Image
                    src="/hsi-logo.png"
                    alt="HSI Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Data Room</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Data Room folder tree */}
        <SidebarGroup>
          <SidebarGroupLabel>Data Room</SidebarGroupLabel>
          <SidebarGroupContent>
            <DataRoomNav />
            <div className="mt-1 px-2 flex justify-start group-data-[collapsible=icon]:justify-center">
              <AddNavigationButton />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Rest of navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Others</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain
                .filter((item) => item.title !== "Data Room")
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {displayName
                        .split(" ")
                        .map((n) => n[0])
                        .filter(Boolean)
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs">{displayEmail}</span>
                  </div>
                  <ChevronDownIcon className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {displayName
                          .split(" ")
                          .map((n) => n[0])
                          .filter(Boolean)
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{displayName}</span>
                      <span className="truncate text-xs">{displayEmail}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "dark" ? (
                    <>
                      <SunIcon className="mr-2 h-4 w-4" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <MoonIcon className="mr-2 h-4 w-4" />
                      Dark Mode
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BellIcon className="mr-2 h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
