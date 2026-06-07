import { createFileRoute, Outlet, redirect, useRouter, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw redirect({ to: "/auth" });
    
    // 1. Fetch primary profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    let role = profile?.role;

    // 2. Fallback to authorized_staff if profile not found (for new signups)
    if (!role) {
      const { data: auth } = await supabase
        .from("authorized_staff")
        .select("role")
        .eq("email", user.email)
        .maybeSingle();
      role = auth?.role || "TEACHER";
    }

    return { user, role: role as "ADMIN" | "TEACHER" | "BURSAR" };
  },
  component: AuthenticatedLayout,
});

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/streams": "Class Streams",
  "/students": "Students",
  "/subjects": "Subjects",
  "/scores": "Score Entry",
  "/results": "Results & Rankings",
  "/reports": "PDF Reports",
  "/fees": "Fee Management",
  "/users": "User Management",
  "/my-classes": "My Classes",
  "/staff-attendance": "Staff Attendance",
  "/lesson-plans": "Lesson Plans",
  "/attendance": "Student Attendance",
  "/settings": "Settings",
};

function AuthenticatedLayout() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role, user } = Route.useRouteContext();
  const title = TITLES[path] ?? "Ikonex Academy";

  // State for profile display in header
  const { data: profile } = useQuery({
    queryKey: ["current-user-profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("full_name, role").eq("id", user?.id).maybeSingle()).data,
    enabled: !!user?.id
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.navigate({ to: "/auth" });
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 h-14 flex items-center gap-3 border-b bg-card/80 backdrop-blur px-4">
            <SidebarTrigger />
            <div className="flex items-baseline gap-2">
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Ikonex Academy</Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-sm font-semibold">{title}</h1>
            </div>
            <div className="ml-4 hidden md:block">
              <GlobalSearch />
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold leading-none">{profile?.full_name || user?.email?.split('@')[0]}</span>
                <span className="text-[10px] font-bold uppercase text-primary tracking-tighter leading-none mt-1">{profile?.role || role}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="p-6 md:p-8 max-w-[1400px] mx-auto w-full">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
