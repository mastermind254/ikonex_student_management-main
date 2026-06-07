import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Daily Attendance — Ikonex Academy" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const qc = useQueryClient();
  const { user, role } = Route.useRouteContext();
  const [streamId, setStreamId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [edits, setEdits] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED">>({});

  const { data: streams = [] } = useQuery({
    queryKey: ["teacher-streams", user.id, role],
    queryFn: async () => {
      if (role === "ADMIN") {
        return (await supabase.from("streams").select("id, name").order("name")).data ?? [];
      } else {
        const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
        if (!teacher) return [];
        const { data } = await supabase.from("teacher_assignments").select("stream_id, streams(id, name)").eq("teacher_id", teacher.id);
        const uniqueStreams = new Map();
        (data ?? []).forEach((a: any) => {
          if (a.streams && !uniqueStreams.has(a.stream_id)) uniqueStreams.set(a.stream_id, a.streams);
        });
        return Array.from(uniqueStreams.values()).sort((a, b) => a.name.localeCompare(b.name));
      }
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-attendance", streamId],
    enabled: !!streamId,
    queryFn: async () => (await supabase.from("students").select("id, full_name, admission_number").eq("stream_id", streamId).order("full_name")).data ?? [],
  });

  const { data: existingAttendance = [] } = useQuery({
    queryKey: ["attendance-records", streamId, date],
    enabled: !!streamId && !!date && students.length > 0,
    queryFn: async () => {
      const studentIds = students.map((s: any) => s.id);
      return (await supabase.from("attendance").select("*").eq("date", date).in("student_id", studentIds)).data ?? [];
    },
  });

  // Sync state with existing data
  useEffect(() => {
    if (!students.length) return;
    
    const newEdits: Record<string, any> = {};
    students.forEach((st: any) => {
      const existing = existingAttendance.find((a: any) => a.student_id === st.id);
      newEdits[st.id] = existing ? existing.status : "PRESENT";
    });

    // Only update if the stringified content actually changed
    const currentStr = JSON.stringify(edits);
    const nextStr = JSON.stringify(newEdits);
    
    if (currentStr !== nextStr) {
      setEdits(newEdits);
    }
  }, [students, existingAttendance, streamId, date]);

  const setStatus = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") => {
    setEdits((prev) => ({ ...prev, [studentId]: status }));
  };

  const save = async () => {
    if (!streamId || !date) return toast.error("Choose stream and date");
    
    const upserts = students.map((st: any) => ({
      student_id: st.id,
      date,
      status: edits[st.id] || "PRESENT"
    }));

    if (!upserts.length) return toast.info("No students to update");
    
    const { error } = await supabase.from("attendance").upsert(upserts, { onConflict: "student_id,date" });
    if (error) return toast.error(error.message);
    
    toast.success(`Saved attendance for ${upserts.length} students`);
    qc.invalidateQueries({ queryKey: ["attendance-records"] });
  };

  const markSelfAttendance = async () => {
    const { data: teacher } = await supabase.from("teachers").select("profile_id").eq("profile_id", user.id).maybeSingle();
    if (!teacher) return toast.error("Teacher record not found");

    const { error } = await supabase.from("staff_attendance").insert({
      profile_id: user.id,
      check_in_time: new Date().toISOString(),
      status: "ON TIME"
    });

    if (error) return toast.error(error.message);
    toast.success("Your attendance has been recorded for today.");
  };

  const markAll = (status: "PRESENT" | "ABSENT") => {
    const newEdits: Record<string, any> = {};
    students.forEach((st: any) => newEdits[st.id] = status);
    setEdits(newEdits);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Daily Attendance</h2>
          <p className="text-muted-foreground">Track student attendance and record your reporting time.</p>
        </div>
        <div className="flex gap-2">
          {role === "TEACHER" && (
            <Button variant="outline" onClick={markSelfAttendance} className="bg-primary/5 border-primary/20 text-primary">
              <Clock className="h-4 w-4 mr-1.5" /> Mark My Attendance
            </Button>
          )}
          <Button onClick={save} disabled={!streamId || students.length === 0} className="ml-auto">
            <Save className="h-4 w-4 mr-1.5" /> Save Class Roster
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Selection</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2 min-w-[200px]"><Label>Stream</Label>
            <Select value={streamId} onValueChange={setStreamId}>
              <SelectTrigger><SelectValue placeholder="Select Stream" /></SelectTrigger>
              <SelectContent>
                {Array.isArray(streams) && streams.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          </div>
          <Button onClick={save} disabled={!streamId || !students || students.length === 0} className="ml-auto">
            <Save className="h-4 w-4 mr-1.5" /> Save Attendance
          </Button>
        </CardContent>
      </Card>

      {streamId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Class Roster</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => markAll("PRESENT")} className="text-emerald-600 hover:text-emerald-700">
                Mark All Present
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead className="w-64">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No students in this stream.</TableCell></TableRow>}
                {students.map((st: any) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{st.admission_number}</TableCell>
                    <TableCell>
                      <Select value={edits[st.id] || "PRESENT"} onValueChange={(v) => setStatus(st.id, v as any)}>
                        <SelectTrigger className={`w-full ${
                          edits[st.id] === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          edits[st.id] === 'ABSENT' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          edits[st.id] === 'LATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENT"><div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Present</div></SelectItem>
                          <SelectItem value="ABSENT"><div className="flex items-center"><XCircle className="w-4 h-4 mr-2 text-destructive" /> Absent</div></SelectItem>
                          <SelectItem value="LATE"><div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-amber-500" /> Late</div></SelectItem>
                          <SelectItem value="EXCUSED">Excused</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
