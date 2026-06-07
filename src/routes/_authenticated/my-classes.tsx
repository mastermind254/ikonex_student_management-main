import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Layers, Users, TrendingUp, Search, Calendar, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/my-classes")({
  head: () => ({ meta: [{ title: "My Classes — Ikonex Academy" }] }),
  component: MyClassesPage,
});

function MyClassesPage() {
  const { user } = Route.useRouteContext();
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["my-assignments", user.id],
    queryFn: async () => {
      const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
      const teacherId = teacher?.id || (await supabase.from("teachers").select("id").eq("email", user.email).maybeSingle()).data?.id;
      
      if (!teacherId) return [];
      
      const { data } = await supabase
        .from("teacher_assignments")
        .select("id, stream_id, subject_id, streams(id, name), subjects(id, name, code)")
        .eq("teacher_id", teacherId);
      return data ?? [];
    },
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["class-students", selectedStream],
    enabled: !!selectedStream,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, full_name, admission_number, profile_picture").eq("stream_id", selectedStream).order("full_name");
      return data ?? [];
    },
  });

  const filteredStudents = students.filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()) || s.admission_number.includes(search));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h2 className="text-3xl font-black tracking-tighter text-foreground">Classroom Hub</h2>
        <p className="text-muted-foreground font-medium">Overview of your assigned streams and student rosters.</p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground animate-pulse font-black uppercase tracking-[0.3em]">Mapping Assignments...</div>
      ) : assignments.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent shadow-none rounded-[2rem]">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-6 opacity-10" />
            <h3 className="text-xl font-bold text-foreground">No Assignments Found</h3>
            <p className="text-muted-foreground max-w-sm mt-2 font-medium">
              You haven't been assigned to teach any subjects yet. Please reach out to the Registrar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Assignments Sidebar */}
          <div className="xl:col-span-4 space-y-4">
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">My Teaching Schedule</p>
             {assignments.map((assignment: any) => (
               <button 
                 key={assignment.id} 
                 onClick={() => setSelectedStream(assignment.stream_id)}
                 className={`w-full text-left p-6 rounded-[2rem] transition-all group border ${
                    selectedStream === assignment.stream_id 
                    ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200" 
                    : "bg-white hover:bg-slate-50 border-slate-100 shadow-sm"
                 }`}
               >
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                       <div className={`text-[10px] font-black uppercase tracking-widest ${selectedStream === assignment.stream_id ? 'text-indigo-400' : 'text-primary'}`}>
                          {assignment.subjects?.code}
                       </div>
                       <h3 className="text-lg font-black leading-tight">{assignment.subjects?.name}</h3>
                       <div className={`flex items-center gap-1.5 text-sm font-bold ${selectedStream === assignment.stream_id ? 'text-white/60' : 'text-muted-foreground'}`}>
                          <Layers className="w-3.5 h-3.5" /> {assignment.streams?.name}
                       </div>
                    </div>
                    <div className={`p-2 rounded-xl transition-colors ${selectedStream === assignment.stream_id ? 'bg-white/10' : 'bg-slate-100 group-hover:bg-primary/10'}`}>
                       <ChevronRight className={`w-4 h-4 ${selectedStream === assignment.stream_id ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                 </div>
                 <div className="flex gap-4 mt-6">
                    <Link 
                      to="/scores" 
                      search={{ stream: assignment.stream_id, subject: assignment.subject_id }}
                      className={`text-xs font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all ${
                         selectedStream === assignment.stream_id ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      Enter Marks
                    </Link>
                    <Link 
                      to="/attendance" 
                      className={`text-xs font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all ${
                         selectedStream === assignment.stream_id ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      Attendance
                    </Link>
                 </div>
               </button>
             ))}
          </div>

          {/* Student Roster */}
          <div className="xl:col-span-8">
             {selectedStream ? (
                <div className="space-y-6">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                         <h3 className="text-2xl font-black tracking-tight">Student Roster</h3>
                         <p className="text-muted-foreground font-medium">Viewing {students.length} students in {assignments.find(a => a.stream_id === selectedStream)?.streams?.name}</p>
                      </div>
                      <div className="relative w-full md:w-64">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                         <Input 
                            placeholder="Search student..." 
                            className="pl-10 h-12 rounded-xl border-slate-200 bg-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                         />
                      </div>
                   </div>

                   <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="border-none">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest px-8 py-6">Student Identity</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest">Admission No.</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-8">Quick Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentsLoading ? (
                             <TableRow><TableCell colSpan={3} className="py-20 text-center animate-pulse text-muted-foreground">Retrieving Roster...</TableCell></TableRow>
                          ) : filteredStudents.length === 0 ? (
                             <TableRow><TableCell colSpan={3} className="py-20 text-center text-muted-foreground italic">No students found matching your search.</TableCell></TableRow>
                          ) : (
                             filteredStudents.map((s) => (
                               <TableRow key={s.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                 <TableCell className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                                          {s.full_name.charAt(0)}
                                       </div>
                                       <span className="font-bold text-sm">{s.full_name}</span>
                                    </div>
                                 </TableCell>
                                 <TableCell className="font-mono text-xs font-bold text-slate-400">
                                    {s.admission_number}
                                 </TableCell>
                                 <TableCell className="px-8 text-right">
                                    <Button asChild variant="ghost" className="rounded-xl font-bold text-primary group-hover:bg-white group-hover:shadow-sm transition-all">
                                       <Link to={`/students/${s.id}`}>View Portfolio</Link>
                                    </Button>
                                 </TableCell>
                               </TableRow>
                             ))
                          )}
                        </TableBody>
                      </Table>
                   </Card>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                   <Users className="w-16 h-16 text-slate-200 mb-6" />
                   <h3 className="text-xl font-bold text-slate-400">Select a Class</h3>
                   <p className="text-slate-400 max-w-xs mx-auto font-medium mt-2">Pick an assignment from the sidebar to view the active student roster.</p>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
