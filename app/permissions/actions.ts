"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function updateUserName(userId: string, name: string): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name cannot be empty" };

  const { error } = await supabaseAdmin
    .from("users")
    .update({ name: trimmed })
    .eq("id", userId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  // Delete permissions first (references user_id)
  await supabaseAdmin.from("permissions").delete().eq("user_id", userId);

  // Delete from users table
  const { error: profileError } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  // Delete auth user
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    // Profile already deleted; auth delete may fail if user doesn't exist in auth
    // eslint-disable-next-line no-console
    console.warn("Auth user deletion warning:", authError.message);
  }

  return {};
}
