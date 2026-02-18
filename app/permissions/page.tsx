"use client";

import * as React from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { SearchBar } from "@/components/dataroom/search-bar";
import { 
  MoreHorizontalIcon, 
  FolderIcon,
  FileTextIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { DataRoomFolder, DataRoomFile } from "@/lib/dataroom-types";
import { isFolder, isFile } from "@/lib/dataroom-types";
import { fetchDataRoomTree } from "@/lib/dataroom-supabase";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputDialog } from "@/components/dataroom/input-dialog";
import { ConfirmDialog } from "@/components/dataroom/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { updateUserName, deleteUser } from "./actions";

type PermissionFlags = { edit: boolean };
type PermissionSet = Record<string, PermissionFlags>;

type PermissionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type PermissionItem = {
  id: string;
  name: string;
  kind: "folder" | "file";
  children?: PermissionItem[];
};

function buildPermissionItems(rootFolders: DataRoomFolder[]): {
  items: PermissionItem[];
  kindsById: Record<string, "folder" | "file">;
} {
  const kindsById: Record<string, "folder" | "file"> = {};

  const folderToItem = (folder: DataRoomFolder): PermissionItem => {
    const folderItem: PermissionItem = {
      id: folder.id,
      name: folder.name,
      kind: "folder",
      children: [],
    };
    kindsById[folder.id] = "folder";

    const childFolders = folder.children.filter(isFolder);
    const childFiles = folder.children.filter(isFile) as DataRoomFile[];

    const children: PermissionItem[] = [];
    for (const f of childFolders) {
      children.push(folderToItem(f));
    }
    for (const file of childFiles) {
      kindsById[file.id] = "file";
      children.push({
        id: file.id,
        name: file.name,
        kind: "file",
      });
    }
    if (children.length) folderItem.children = children;
    return folderItem;
  };

  const items = rootFolders.map(folderToItem);
  return { items, kindsById };
}

export default function PermissionsPage() {
  const { profile, loading } = useAuth();
  const isAdmin = profile?.role === "admin";
  const toast = useToast();

  const [users, setUsers] = React.useState<PermissionUser[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<PermissionUser | null>(null);
  const [searchUser, setSearchUser] = React.useState("");
  const [searchFile, setSearchFile] = React.useState("");
  const [expandedFolders, setExpandedFolders] = React.useState<string[]>([]);
  const [filesTree, setFilesTree] = React.useState<PermissionItem[]>([]);
  const [itemKinds, setItemKinds] = React.useState<Record<string, "folder" | "file">>({});
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [loadingTree, setLoadingTree] = React.useState(true);
  
  // Store all user permissions - keyed by user ID
  const [allUserPermissions, setAllUserPermissions] = React.useState<Record<string, PermissionSet>>({});

  const currentPermissions = selectedUser ? allUserPermissions[selectedUser.id] || {} : {};

  // Add User Dialog State
  const [addUserDialogOpen, setAddUserDialogOpen] = React.useState(false);
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserPassword, setNewUserPassword] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState<"user" | "admin">("user");
  const [addUserError, setAddUserError] = React.useState<string | null>(null);
  const [addingUser, setAddingUser] = React.useState(false);

  // Edit / Delete user dialogs
  const [editUserOpen, setEditUserOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<PermissionUser | null>(null);
  const [deleteUserOpen, setDeleteUserOpen] = React.useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = React.useState<PermissionUser | null>(null);

  const formatAddUserErrorMessage = (err: unknown): string => {
    const anyErr = err as { message?: string; code?: string } | null | undefined;
    const msg = (anyErr?.message ?? "").toString();
    const code = (anyErr?.code ?? "").toString();

    // Postgres unique constraint violations (e.g. users.email unique)
    if (
      code === "23505" ||
      msg.includes("users_email_key") ||
      msg.toLowerCase().includes("duplicate key value violates unique constraint")
    ) {
      return "That email is already in use. Try a different email or edit the existing user.";
    }

    // Supabase auth sign-up conflicts
    if (msg.toLowerCase().includes("user already registered") || msg.toLowerCase().includes("already been registered")) {
      return "That email is already registered. Try a different email or invite the existing user.";
    }

    return msg || "Failed to add user. Please try again.";
  };

  // Load users from DB (only on mount – selectedUser is set here, not as trigger)
  React.useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role")
        .order("name", { ascending: true });
      if (cancelled) return;
      if (error || !data) {
        setUsers([]);
        setSelectedUser(null);
      } else {
        const mapped = data as PermissionUser[];
        setUsers(mapped);
        setSelectedUser((prev) => (prev ? prev : mapped.length > 0 ? mapped[0] : null));
      }
      setLoadingUsers(false);
    };
    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load folder/file tree from DB
  React.useEffect(() => {
    let cancelled = false;
    const loadTree = async () => {
      setLoadingTree(true);
      try {
        const rootFolders = await fetchDataRoomTree();
        if (cancelled) return;
        const { items, kindsById } = buildPermissionItems(rootFolders as DataRoomFolder[]);
        setFilesTree(items);
        setItemKinds(kindsById);
        const initialExpanded = items.filter((i) => i.kind === "folder").map((i) => i.id);
        setExpandedFolders(initialExpanded);
      } finally {
        if (!cancelled) setLoadingTree(false);
      }
    };
    void loadTree();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPermissionsForUser = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("permissions")
      .select("folder_id, file_id, can_edit")
      .eq("user_id", userId);
    if (error || !data) return;
    const perms: PermissionSet = {};
    for (const row of data as {
      folder_id: string | null;
      file_id: string | null;
      can_edit: boolean | null;
    }[]) {
      const itemId = row.folder_id ?? row.file_id;
      if (!itemId) continue;
      perms[itemId] = {
        edit: !!row.can_edit,
      };
    }
    setAllUserPermissions((prev) => ({
      ...prev,
      [userId]: perms,
    }));
  }, []);

  React.useEffect(() => {
    if (!selectedUser) return;
    if (allUserPermissions[selectedUser.id]) return;
    void loadPermissionsForUser(selectedUser.id);
  }, [selectedUser, allUserPermissions, loadPermissionsForUser]);

  const handleSelectUser = (user: PermissionUser) => {
    setSelectedUser(user);
  };

  const persistPermission = React.useCallback(
    async (userId: string, itemId: string, flags: PermissionFlags) => {
      const kind = itemKinds[itemId];
      if (!kind) return;

      if (!flags.edit) {
        const { error } = await supabase
          .from("permissions")
          .delete()
          .eq("user_id", userId)
          .eq(kind === "folder" ? "folder_id" : "file_id", itemId);
        if (error) {
          // eslint-disable-next-line no-console
          console.error("Failed to delete permission", error);
        }
        return;
      }

      const payload: {
        user_id: string;
        folder_id: string | null;
        file_id: string | null;
        can_edit: boolean;
      } = {
        user_id: userId,
        folder_id: kind === "folder" ? itemId : null,
        file_id: kind === "file" ? itemId : null,
        can_edit: flags.edit,
      };

      const onConflict = kind === "folder" ? "user_id,folder_id" : "user_id,file_id";
      const { error } = await supabase.from("permissions").upsert(payload, { onConflict });
      if (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to save permission", error);
      }
    },
    [itemKinds]
  );

  // Helper function to get all children IDs of an item (recursive)
  const getAllChildrenIds = (item: PermissionItem): string[] => {
    const ids: string[] = [];
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        ids.push(child.id);
        if (child.children && child.children.length > 0) {
          ids.push(...getAllChildrenIds(child));
        }
      }
    }
    return ids;
  };

  // Find an item in the tree by ID
  const findItemById = (items: PermissionItem[], id: string): PermissionItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children && item.children.length > 0) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const togglePermission = (itemId: string) => {
    if (!selectedUser) return;
    
    const item = findItemById(filesTree, itemId);
    if (!item) return;

    setAllUserPermissions((prev) => {
      const userPerms = prev[selectedUser.id] || {};
      const current = userPerms[itemId] || { edit: false };
      const next: PermissionFlags = {
        edit: !current.edit,
      };
      
      // Get all children IDs if this is a folder
      const childrenIds = item.kind === "folder" ? getAllChildrenIds(item) : [];
      
      // Update permission for the clicked item
      const updatedUserPerms: PermissionSet = {
        ...userPerms,
        [itemId]: next,
      };
      
      // Cascade the same permission to all children
      for (const childId of childrenIds) {
        updatedUserPerms[childId] = next;
        // Persist each child permission
        void persistPermission(selectedUser.id, childId, next);
      }
      
      // Persist the main item permission
      void persistPermission(selectedUser.id, itemId, next);
      
      return {
        ...prev,
        [selectedUser.id]: updatedUserPerms,
      };
    });
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addingUser) return;
    setAddUserError(null);
    setAddingUser(true);

    try {
      // Create auth user with email confirmation disabled for admin-created users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail.trim(),
        password: newUserPassword,
        options: { 
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/`,
          // Note: This requires Supabase email confirmation to be disabled in project settings
          // or use the Admin API for auto-confirmation
        },
      });

      if (authError) {
        setAddUserError(formatAddUserErrorMessage(authError));
        setAddingUser(false);
        return;
      }

      if (!authData.user) {
        setAddUserError("Failed to create user");
        setAddingUser(false);
        return;
      }

      // Create user profile
      // Always use the provided name if it exists, only fall back to email prefix if name is empty
      const trimmedName = newUserName.trim();
      const trimmedEmail = newUserEmail.trim();
      // Extract name from email (part before @) only if name is not provided
      const emailNameFallback = trimmedEmail.includes("@") 
        ? trimmedEmail.split("@")[0] 
        : trimmedEmail.split(".")[0]; // Fallback for emails without @ (e.g., "ctamis.gmail.com" -> "ctamis")
      const nameToUse = trimmedName || emailNameFallback;
      
      const { error: profileError } = await supabase
        .from("users")
        .upsert(
          {
            id: authData.user.id,
            name: nameToUse,
            email: authData.user.email || trimmedEmail,
            role: newUserRole,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        setAddUserError(formatAddUserErrorMessage(profileError));
        setAddingUser(false);
        return;
      }

      // Refresh users list
      const { data: updatedUsers, error: fetchError } = await supabase
        .from("users")
        .select("id, name, email, role")
        .order("name", { ascending: true });

      if (!fetchError && updatedUsers) {
        setUsers(updatedUsers as PermissionUser[]);
      }

      // Reset form and close dialog
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("user");
      setAddUserDialogOpen(false);
      setAddingUser(false);
    } catch (err) {
      setAddUserError(formatAddUserErrorMessage(err));
      setAddingUser(false);
    }
  };

  const handleEditUserName = async (newName: string) => {
    if (!editUser) return;
    const { error } = await updateUserName(editUser.id, newName);
    if (error) {
      toast.error(error);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === editUser.id ? { ...u, name: newName.trim() } : u))
    );
    if (selectedUser?.id === editUser.id) {
      setSelectedUser((prev) =>
        prev && prev.id === editUser.id ? { ...prev, name: newName.trim() } : prev
      );
    }
    setEditUserOpen(false);
    setEditUser(null);
    toast.success("User name updated");
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    const { error } = await deleteUser(deleteUserTarget.id);
    if (error) {
      toast.error(error);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== deleteUserTarget.id));
    if (selectedUser?.id === deleteUserTarget.id) {
      setSelectedUser(null);
    }
    setDeleteUserOpen(false);
    setDeleteUserTarget(null);
    toast.success("User deleted");
  };

  const renderFileRow = (item: PermissionItem, level: number = 0) => {
    const isExpanded = expandedFolders.includes(item.id);
    const hasChildren = !!item.children && item.children.length > 0;
    const itemPermissions = currentPermissions[item.id] || { edit: false };
    
    // Check if selected user is admin - admins always have edit access
    const isSelectedUserAdmin = selectedUser?.role === "admin";
    const hasEditAccess = isSelectedUserAdmin || itemPermissions.edit;
    
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
            {item.kind === "folder" ? (
              <FolderIcon className="h-4 w-4 text-primary" />
            ) : (
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Name */}
          <span className="flex-1 text-sm truncate ml-2">{item.name}</span>

          {/* Permissions toggles */}
          <div className="flex items-center pr-2">
            <Switch 
              checked={hasEditAccess}
              onCheckedChange={() => togglePermission(item.id)}
              disabled={isSelectedUserAdmin}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child) => renderFileRow(child, level + 1))}
          </div>
        )}
      </React.Fragment>
    );
  };

  const normalizedSearchUser = searchUser.trim().toLowerCase();
  const filteredUsers = users.filter((u) =>
    normalizedSearchUser
      ? u.name.toLowerCase().includes(normalizedSearchUser) ||
        u.email.toLowerCase().includes(normalizedSearchUser)
      : true
  );

  const usersWithAccessIds = new Set(
    filteredUsers
      .filter((u) => {
        const perms = allUserPermissions[u.id];
        if (!perms) return false;
        return Object.values(perms).some((p) => p.edit);
      })
      .map((u) => u.id)
  );

  const usersWithAccess = filteredUsers.filter((u) => usersWithAccessIds.has(u.id));
  const usersWithoutAccess = filteredUsers.filter((u) => !usersWithAccessIds.has(u.id));

  if (!loading && !isAdmin) {
    return (
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb className="ml-2 px-3 py-1 rounded-md bg-muted/50">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Permissions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">
            Only administrators can manage permissions. You have view-only access to this page.
          </p>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumb className="ml-2 px-3 py-1 rounded-md bg-muted/50">
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
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Users</CardTitle>
            {isAdmin && (
              <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                      Create a new user account. Only administrators can add users.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddUser}>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="add-user-name">Name</FieldLabel>
                        <Input
                          id="add-user-name"
                          type="text"
                          placeholder="Full name"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          disabled={addingUser}
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="add-user-email">Email</FieldLabel>
                        <Input
                          id="add-user-email"
                          type="email"
                          placeholder="user@example.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          disabled={addingUser}
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="add-user-password">Password</FieldLabel>
                        <Input
                          id="add-user-password"
                          type="password"
                          placeholder="••••••••"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          disabled={addingUser}
                          required
                          minLength={6}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="add-user-role">Role</FieldLabel>
                        <Select
                          value={newUserRole}
                          onValueChange={(value) => setNewUserRole(value as "user" | "admin")}
                          disabled={addingUser}
                        >
                          <SelectTrigger id="add-user-role" className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>
                    {addUserError && (
                      <FieldError className="text-sm mt-2">{addUserError}</FieldError>
                    )}
                    <DialogFooter className="mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setAddUserDialogOpen(false);
                          setNewUserName("");
                          setNewUserEmail("");
                          setNewUserPassword("");
                          setNewUserRole("user");
                          setAddUserError(null);
                        }}
                        disabled={addingUser}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addingUser}>
                        {addingUser ? "Adding..." : "Add User"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
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
              <p className="text-xs text-muted-foreground">Editors</p>
            </div>
            <div className="space-y-1 px-2">
              {loadingUsers && (
                <p className="text-xs text-muted-foreground px-2 pb-2">Loading users…</p>
              )}
              {!loadingUsers && usersWithAccess.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 pb-2">
                  No users with explicit permissions yet.
                </p>
              )}
              {usersWithAccess.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedUser && selectedUser.id === user.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback
                      className={
                        selectedUser && selectedUser.id === user.id
                          ? "bg-primary-foreground text-primary"
                          : ""
                      }
                    >
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p
                      className={`text-xs truncate ${
                        selectedUser && selectedUser.id === user.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {user.role}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                        >
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="focus:bg-primary/10 focus:text-primary"
                          onSelect={(e) => {
                            e.preventDefault();
                            setEditUser(user);
                            setEditUserOpen(true);
                          }}
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Edit user name
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="focus:bg-destructive/10 focus:text-destructive"
                          disabled={user.id === profile?.id}
                          onSelect={(e) => {
                            e.preventDefault();
                            if (user.id === profile?.id) return;
                            setDeleteUserTarget(user);
                            setDeleteUserOpen(true);
                          }}
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>

            {/* Don't Have Access Section */}
            <div className="px-4 py-2 mt-4">
              <p className="text-xs text-muted-foreground">View only</p>
            </div>
            <div className="space-y-1 px-2 flex-1 overflow-auto">
              {!loadingUsers && usersWithoutAccess.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 pb-2">
                  Everyone has explicit permissions or no users found.
                </p>
              )}
              {usersWithoutAccess.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedUser && selectedUser.id === user.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback
                      className={
                        selectedUser && selectedUser.id === user.id
                          ? "bg-primary-foreground text-primary"
                          : ""
                      }
                    >
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p
                      className={`text-xs truncate ${
                        selectedUser && selectedUser.id === user.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {user.role}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                        >
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="focus:bg-primary/10 focus:text-primary"
                          onSelect={(e) => {
                            e.preventDefault();
                            setEditUser(user);
                            setEditUserOpen(true);
                          }}
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Edit user name
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="focus:bg-destructive/10 focus:text-destructive"
                          disabled={user.id === profile?.id}
                          onSelect={(e) => {
                            e.preventDefault();
                            if (user.id === profile?.id) return;
                            setDeleteUserTarget(user);
                            setDeleteUserOpen(true);
                          }}
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

            {/* Admin Notice */}
            {selectedUser && selectedUser.role === "admin" && (
              <div className="mx-4 mb-3 p-3 bg-primary/10 border border-primary/20 rounded-md">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">Admin users</span> automatically have full view and edit access to all files and folders. Permissions cannot be modified for admin users.
                </p>
              </div>
            )}

            {/* Column Headers */}
            <div className="flex items-center py-2 px-4 border-b text-sm text-muted-foreground bg-muted/30">
              <span className="flex-1">Permissions</span>
              <div className="pr-2">
                <span className="w-[44px] text-center inline-block">Edit</span>
              </div>
            </div>

            {/* Files Tree */}
            <div className="flex-1 overflow-auto">
              {loadingTree && (
                <p className="text-xs text-muted-foreground px-4 py-3">Loading files…</p>
              )}
              {!loadingTree && filesTree.length === 0 && (
                <p className="text-xs text-muted-foreground px-4 py-3">
                  No folders/files found in the data room yet.
                </p>
              )}
              {!loadingTree && filesTree.map((item) => renderFileRow(item))}
            </div>
          </CardContent>
        </Card>
      </div>

      <InputDialog
        open={editUserOpen}
        onOpenChange={(open) => {
          setEditUserOpen(open);
          if (!open) setEditUser(null);
        }}
        title="Edit user name"
        description="Enter the new name for this user."
        label="Name"
        placeholder="User name"
        defaultValue={editUser?.name ?? ""}
        submitLabel="Save"
        onSubmit={handleEditUserName}
      />

      <ConfirmDialog
        open={deleteUserOpen}
        onOpenChange={(open) => {
          setDeleteUserOpen(open);
          if (!open) setDeleteUserTarget(null);
        }}
        title="Delete user"
        description={`Are you sure you want to delete ${deleteUserTarget?.name ?? "this user"}? This will remove their account and all their permissions. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteUser}
      />
    </SidebarInset>
  );
}
