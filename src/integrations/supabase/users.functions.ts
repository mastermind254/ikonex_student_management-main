import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "../supabase/client.server";
import { requireSupabaseAuth } from "../supabase/auth-middleware";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "TEACHER", "BURSAR"]),
  full_name: z.string().min(2),
});

export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(createUserSchema)
  .handler(async ({ data, context }) => {
    // Check if the current user is an admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();

    if (profile?.role !== "ADMIN") {
      throw new Error("Unauthorized: Only admins can create users");
    }

    // Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });

    if (createError) {
      throw new Error(createError.message);
    }

    // Create the profile
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: newUser.user.id,
      role: data.role,
      full_name: data.full_name,
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    // If it's a teacher, also create a record in the teachers table
    if (data.role === "TEACHER") {
      await supabaseAdmin.from("teachers").insert({
        profile_id: newUser.user.id,
        full_name: data.full_name,
        email: data.email,
      });
    }

    return { success: true, userId: newUser.user.id };
  });
