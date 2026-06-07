import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, Upload, Trash2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/scores")({
  head: () => ({ meta: [{ title: "Score Entry — Ikonex Academy" }] }),
  component: ScoreEntry,
});

function ScoreEntry() {
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const [termId, setTermId] = useState<string>("");
  const [streamId, setStreamId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [assessment, setAssessment] = useState<"CAT1" | "CAT2" | "EXAM">("EXAM");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [importOpen, setImportOpen] = useState(false);

  // Get active teacher
  const { data: teacher } = useQuery({
    queryKey: ["current-teacher-scores", user.id],
    queryFn: async () => (await supabase.from("teachers").select("id").eq("profile_id", user.id).maybeSingle()).data,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => (await supabase.from("terms").select("*").order("year", { ascending: false })).data ?? [],
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["teacher-assignments-scores", teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => (await supabase.from("teacher_assignments").select("stream_id, subject_id, streams(id, name), subjects(id, name)").eq("teacher_id", teacher!.id)).data ?? [],
  });

  // Extract unique streams and subjects from assignments
  const streams = useMemo(() => {
     const map = new Map();
     assignments.forEach((a: any) => map.set(a.stream_id, a.streams));
     return Array.from(map.values());
  }, [assignments]);

  const subjects = useMemo(() => {
     return assignments.filter((a: any) => a.stream_id === streamId).map((a: any) => a.subjects);
  }, [assignments, streamId]);

  useEffect(() => {
    if (!termId && terms.length) setTermId((terms.find((t: any) => t.is_active) ?? terms[0]).id);
  }, [terms, termId]);

  const { data: students = [] } = useQuery({
    queryKey: ["students-of-stream", streamId],
    enabled: !!streamId,
    queryFn: async () => (await supabase.from("students").select("id, full_name, admission_number").eq("stream_id", streamId).order("full_name")).data ?? [],
  });

  const { data: existingScores = [] } = useQuery({
    queryKey: ["scores", termId, subjectId, assessment, streamId],
    enabled: !!termId && !!subjectId && students.length > 0,
    queryFn: async () => (await supabase.from("scores").select("*").eq("term_id", termId).eq("subject_id", subjectId).eq("assessment_type", assessment).in("student_id", students.map((s: any) => s.id))).data ?? [],
  });

  const existingMap = useMemo(() => {
    const m = new Map<string, any>();
    existingScores.forEach((s: any) => m.set(s.student_id, s));
    return m;
  }, [existingScores]);

  const setMark = (studentId: string, val: string) => setEdits((e) => ({ ...e, [studentId]: val }));

  const save = async () => {
    if (!termId || !subjectId) return toast.error("Choose term and subject");
    const upserts: any[] = [];
    let invalid = false;
    for (const st of students) {
      const inputVal = edits[st.id];
      const existing = existingMap.get(st.id);
      const rawVal = inputVal !== undefined ? inputVal : existing ? String(existing.marks) : "";
      if (rawVal === "") continue;
      const n = Number(rawVal);
      if (Number.isNaN(n) || n < 0 || n > 100) { invalid = true; break; }
      upserts.push({
        student_id: st.id, subject_id: subjectId, term_id: termId, assessment_type: assessment, marks: n,
      });
    }
    if (invalid) return toast.error("Marks must be between 0 and 100");
    if (!upserts.length) return toast.info("Nothing to save");
    const { error } = await supabase.from("scores").upsert(upserts, { onConflict: "student_id,subject_id,assessment_type,term_id" });
    if (error) return toast.error(error.message);
    toast.success(`Marks successfully published`);
    setEdits({});
    qc.invalidateQueries({ queryKey: ["scores"] });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split("\n").filter(l => l.trim());
      const newEdits: Record<string, string> = { ...edits };
      let matchedCount = 0;

      lines.slice(1).forEach(line => {
        const [adm, marks] = line.split(",").map(v => v.trim());
        const student = students.find((s: any) => s.admission_number === adm);
        if (student && marks) {
          newEdits[student.id] = marks;
          matchedCount++;
        }
      });

      setEdits(newEdits);
      setImportOpen(false);
      toast.success(`Imported ${matchedCount} scores`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <Link to="/dashboard" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary flex items-center gap-1 mb-2 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Dashboard
           </Link>
           <h2 className="text-3xl font-black tracking-tighter text-foreground">Academic Scoring</h2>
           <p className="text-muted-foreground font-medium text-sm">Enter marks for CATs and End-of-Term exams.</p>
        </div>
        <div className="flex gap-2">
           <Dialog open={importOpen} onOpenChange={setImportOpen}>
             <DialogTrigger asChild>
               <Button variant="outline" className="rounded-xl font-bold border-slate-200"><Upload className="w-4 h-4 mr-1.5" /> CSV Bulk Upload</Button>
             </DialogTrigger>
             <DialogContent className="rounded-3xl border-none shadow-2xl">
               <DialogHeader>
                 <DialogTitle className="text-xl font-black">Bulk Import</DialogTitle>
                 <DialogDescription className="font-medium">Upload a CSV with <code>admission_number, marks</code>.</DialogDescription>
               </DialogHeader>
               <div className="space-y-4 py-4">
                  <Input type="file" accept=".csv" onChange={handleImport} className="rounded-xl border-slate-200" disabled={!streamId || !subjectId} />
                  {!streamId && <p className="text-xs text-destructive font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Select a class first.</p>}
               </div>
             </DialogContent>
           </Dialog>
           <Button onClick={save} className="rounded-xl font-bold bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200" disabled={!streamId || !subjectId}>
              <Save className="w-4 h-4 mr-1.5" /> Publish Marks
           </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-[2.5rem] bg-slate-50/50 p-2">
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4">
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Active Term</Label>
             <Select value={termId} onValueChange={setTermId}>
               <SelectTrigger className="h-12 rounded-2xl border-none shadow-sm bg-white"><SelectValue /></SelectTrigger>
               <SelectContent>{terms.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} {t.year}</SelectItem>)}</SelectContent>
             </Select>
          </div>
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Class Assignment</Label>
             <Select value={streamId} onValueChange={(v) => { setStreamId(v); setSubjectId(""); }}>
               <SelectTrigger className="h-12 rounded-2xl border-none shadow-sm bg-white"><SelectValue placeholder="Pick a Class" /></SelectTrigger>
               <SelectContent>{streams.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
             </Select>
          </div>
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Subject</Label>
             <Select value={subjectId} onValueChange={setSubjectId} disabled={!streamId}>
               <SelectTrigger className="h-12 rounded-2xl border-none shadow-sm bg-white"><SelectValue placeholder="Pick Subject" /></SelectTrigger>
               <SelectContent>{subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
             </Select>
          </div>
          <div className="space-y-1.5">
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Assessment Type</Label>
             <Select value={assessment} onValueChange={(v) => setAssessment(v as any)}>
               <SelectTrigger className="h-12 rounded-2xl border-none shadow-sm bg-white"><SelectValue /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="CAT1">Continuous Assessment (CAT 1)</SelectItem>
                 <SelectItem value="CAT2">Continuous Assessment (CAT 2)</SelectItem>
                 <SelectItem value="EXAM">End of Term Examination</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </CardContent>
      </Card>

      {streamId && subjectId ? (
        <div className="animate-in slide-in-from-bottom-4 duration-700">
           <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
             <Table>
               <TableHeader className="bg-slate-50/50">
                 <TableRow className="border-none">
                   <TableHead className="font-black text-[10px] uppercase tracking-widest px-10 py-6">Student Full Name</TableHead>
                   <TableHead className="font-black text-[10px] uppercase tracking-widest">Adm. Number</TableHead>
                   <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-10">Score (/100)</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {students.length === 0 ? (
                   <TableRow><TableCell colSpan={3} className="py-20 text-center text-muted-foreground italic">No students enrolled in this stream.</TableCell></TableRow>
                 ) : (
                   students.map((st: any) => {
                     const existing = existingMap.get(st.id);
                     const val = edits[st.id] ?? (existing ? String(existing.marks) : "");
                     const hasValue = val !== "";
                     
                     return (
                       <TableRow key={st.id} className="group hover:bg-slate-50/30 transition-colors border-slate-50">
                         <TableCell className="px-10 py-5">
                            <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${hasValue ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                  {hasValue ? <CheckCircle2 className="w-4 h-4" /> : st.full_name.charAt(0)}
                               </div>
                               <span className="font-bold text-sm text-foreground/80">{st.full_name}</span>
                            </div>
                         </TableCell>
                         <TableCell className="font-mono text-xs font-bold text-slate-400">{st.admission_number}</TableCell>
                         <TableCell className="px-10 text-right">
                           <div className="flex justify-end">
                              <Input 
                                 type="number" 
                                 min={0} max={100} 
                                 className="w-24 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-center font-black text-slate-700" 
                                 value={val} 
                                 onChange={(e) => setMark(st.id, e.target.value)} 
                                 placeholder="—" 
                              />
                           </div>
                         </TableCell>
                       </TableRow>
                     );
                   })
                 )}
               </TableBody>
             </Table>
           </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 text-center bg-slate-50/30 rounded-[3rem] border-2 border-dashed border-slate-200/60">
           <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
           <h3 className="text-lg font-bold text-slate-400">Selection Required</h3>
           <p className="text-slate-400 text-sm max-w-xs mx-auto mt-1 font-medium">Please select a term, class, and subject to begin score entry.</p>
        </div>
      )}
    </div>
  );
}
