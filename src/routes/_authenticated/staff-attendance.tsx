import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff-attendance")({
  head: () => ({ meta: [{ title: "Staff Attendance — Ikonex Academy" }] }),
  component: StaffAttendancePage,
});

function StaffAttendancePage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["staff-attendance-real"],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_attendance")
        .select("*, profiles(full_name, role)")
        .order("check_in_time", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Staff Attendance</h2>
        <p className="text-muted-foreground">Monitor faculty and administrative reporting times.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-600">Reports Today</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-700">{logs.length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reporting Log</CardTitle>
          <CardDescription>Daily check-in status for all system users.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading staff logs...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">No check-ins recorded today.</TableCell></TableRow>
              ) : (
                logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.profiles?.full_name}</TableCell>
                    <TableCell><Badge variant="secondary">{log.profiles?.role}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{log.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
