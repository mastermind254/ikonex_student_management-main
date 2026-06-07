import { Link, useRouterState, useRouteContext } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Layers,
  Users,
  BookOpen,
  ClipboardEdit,
  Trophy,
  FileText,
  Settings,
  GraduationCap,
  CalendarCheck
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, group: "Overview" },
  { title: "My Classes", url: "/my-classes", icon: BookOpen, group: "Overview" },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck, group: "Overview" },
  { title: "Staff Attendance", url: "/staff-attendance", icon: Users, group: "Overview" },
  { title: "Class Streams", url: "/streams", icon: Layers, group: "Records" },
  { title: "Students", url: "/students", icon: Users, group: "Records" },
  { title: "Teachers", url: "/teachers", icon: Users, group: "Records" },
  { title: "Subjects", url: "/subjects", icon: BookOpen, group: "Records" },
  { title: "Score Entry", url: "/scores", icon: ClipboardEdit, group: "Academics" },
  { title: "Results", url: "/results", icon: Trophy, group: "Academics" },
  { title: "PDF Reports", url: "/reports", icon: FileText, group: "Academics" },
  { title: "Lesson Plans", url: "/lesson-plans", icon: BookOpen, group: "Academics" },
  { title: "Fee Management", url: "/fees", icon: FileText, group: "Finance" },
  { title: "User Management", url: "/users", icon: Users, group: "System" },
  { title: "Settings", url: "/settings", icon: Settings, group: "System" },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useRouteContext({ from: "/_authenticated" });

  const filteredItems = items.filter((item) => {
    if (role === "ADMIN") {
      return [
        "/dashboard", 
        "/staff-attendance", 
        "/streams", 
        "/students", 
        "/teachers", 
        "/subjects", 
        "/results", 
        "/reports", 
        "/fees", 
        "/users", 
        "/settings"
      ].includes(item.url);
    }
    if (role === "TEACHER") {
      return ["/dashboard", "/my-classes", "/attendance", "/scores", "/students", "/reports", "/lesson-plans"].includes(item.url);
    }
    if (role === "BURSAR") {
      return ["/dashboard", "/students", "/fees", "/reports"].includes(item.url);
    }
    return false;
  });

  const groups = Array.from(new Set(filteredItems.map((i) => i.group)));

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <img src="/icons/icons8-school-100.png" alt="Ikonex" className="h-7 w-7 brightness-0 invert" />
          </div>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-base tracking-tight text-foreground">Ikonex Academy</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary leading-none">Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-background/50">

        {groups.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredItems.filter((i) => i.group === group).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
