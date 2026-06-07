import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildStudentSubjectSummaries, competitionRank, gradeFor } from "@/lib/results";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  head: () => ({ meta: [{ title: "PDF Reports — Ikonex Academy" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [termId, setTermId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: terms = [] } = useQuery({ queryKey: ["terms"], queryFn: async () => (await supabase.from("terms").select("*").order("year", { ascending: false })).data ?? [] });
  const { data: streams = [] } = useQuery({ queryKey: ["streams-mini"], queryFn: async () => (await supabase.from("streams").select("id,name").order("name")).data ?? [] });
  const { data: students = [] } = useQuery({
    queryKey: ["students-of-stream-r", streamId],
    enabled: !!streamId,
    queryFn: async () => (await supabase.from("students").select("id, full_name, admission_number").eq("stream_id", streamId).order("full_name")).data ?? [],
  });
  useEffect(() => { if (!termId && terms.length) setTermId((terms.find((t: any) => t.is_active) ?? terms[0]).id); }, [terms, termId]);

  const fetchContext = async () => {
    const stream = streams.find((s: any) => s.id === streamId);
    const term = terms.find((t: any) => t.id === termId);
    const allStudents = (await supabase.from("students").select("id, full_name, admission_number").eq("stream_id", streamId)).data ?? [];
    const subs = (await supabase.from("stream_subjects").select("subjects(id,name,code)").eq("stream_id", streamId)).data ?? [];
    const subjects = subs.map((r: any) => r.subjects).filter(Boolean);
    const scores = (await supabase.from("scores").select("*").eq("term_id", termId).in("student_id", allStudents.map((s) => s.id))).data ?? [];
    const scales = (await supabase.from("grading_scales").select("*").order("min_score", { ascending: false })).data ?? [];
    return { stream, term, students: allStudents, subjects, scores, scales };
  };

  const generateStudent = async () => {
    if (!termId || !streamId || !studentId) return toast.error("Pick term, stream and student");
    setBusy(true);
    try {
      const ctx = await fetchContext();
      const { buildReportCard } = await import("@/components/pdf/report-card");
      const summaries = buildStudentSubjectSummaries(ctx.scores as any);
      const overall = ctx.students.map((st: any) => {
        const subs = summaries.filter((s) => s.studentId === st.id);
        const total = subs.reduce((sum, s) => sum + s.total, 0);
        return { studentId: st.id, total };
      });
      const overallRanks = competitionRank(overall, (o) => o.total);
      const myOverall = overall.find((o) => o.studentId === studentId);
      const overallRank = myOverall ? overallRanks.get(myOverall) : undefined;

      const subjectRows = ctx.subjects.map((subj: any) => {
        const rows = ctx.students.map((st: any) => {
          const s = summaries.find((x) => x.studentId === st.id && x.subjectId === subj.id);
          return { studentId: st.id, total: s?.total ?? 0, cat1: s?.cat1 ?? null, cat2: s?.cat2 ?? null, exam: s?.exam ?? null };
        }).filter((r) => r.cat1 != null || r.cat2 != null || r.exam != null);
        const ranks = competitionRank(rows, (r) => r.total);
        const mine = rows.find((r) => r.studentId === studentId);
        const g = mine ? gradeFor(mine.total, ctx.scales as any) : null;
        return {
          subject: subj,
          cat1: mine?.cat1 ?? null, cat2: mine?.cat2 ?? null, exam: mine?.exam ?? null,
          total: mine?.total ?? 0, grade: g?.grade ?? "—", position: mine ? ranks.get(mine) : undefined,
        };
      });

      const student = ctx.students.find((s) => s.id === studentId)!;
      const avg = subjectRows.length ? subjectRows.reduce((a, b) => a + b.total, 0) / subjectRows.length : 0;
      const overallGrade = gradeFor(avg, ctx.scales as any);
      const blob = await buildReportCard({
        student, stream: ctx.stream ?? null, term: ctx.term ?? null, rows: subjectRows,
        total: myOverall?.total ?? 0, average: avg, overallGrade: overallGrade?.grade ?? "—", overallRemarks: overallGrade?.remarks ?? "", overallPosition: overallRank, classSize: ctx.students.length,
      });
      triggerDownload(blob, `report-card-${student.admission_number}.pdf`);
      toast.success("Report card generated");
    } catch (e: any) { toast.error(e.message ?? "Failed to generate"); }
    finally { setBusy(false); }
  };

  const generateClass = async () => {
    if (!termId || !streamId) return toast.error("Pick term and stream");
    setBusy(true);
    try {
      const ctx = await fetchContext();
      const { buildClassReport } = await import("@/components/pdf/class-report");
      const summaries = buildStudentSubjectSummaries(ctx.scores as any);
      const overall = ctx.students.map((st: any) => {
        const subs = summaries.filter((s) => s.studentId === st.id);
        const total = subs.reduce((sum, s) => sum + s.total, 0);
        const avg = subs.length ? total / subs.length : 0;
        return { student: st, total, avg };
      });
      const ranks = competitionRank(overall, (o) => o.total);
      const ranked = [...overall].sort((a, b) => b.total - a.total).map((o) => ({ ...o, position: ranks.get(o)! }));

      const subjectStats = ctx.subjects.map((subj: any) => {
        const totals = ctx.students.map((st: any) => summaries.find((s) => s.studentId === st.id && s.subjectId === subj.id)?.total).filter((v): v is number => typeof v === "number" && v > 0);
        const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
        return { subject: subj, average: avg, highest: totals.length ? Math.max(...totals) : 0, lowest: totals.length ? Math.min(...totals) : 0, entries: totals.length };
      });
      const blob = await buildClassReport({ stream: ctx.stream ?? null, term: ctx.term ?? null, ranked, subjectStats });
      triggerDownload(blob, `class-performance-${ctx.stream?.name ?? "stream"}.pdf`);
      toast.success("Class report generated");
    } catch (e: any) { toast.error(e.message ?? "Failed to generate"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">PDF Reports</h2>
        <p className="text-muted-foreground">Generate individual report cards and class performance reports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Individual Report Card</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Term</Label>
              <Select value={termId} onValueChange={setTermId}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{terms.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} {t.year}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Stream</Label>
              <Select value={streamId} onValueChange={(v) => { setStreamId(v); setStudentId(""); }}><SelectTrigger><SelectValue placeholder="Stream" /></SelectTrigger>
                <SelectContent>{streams.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId} disabled={!streamId}>
                <SelectTrigger><SelectValue placeholder={streamId ? "Pick a student" : "Pick a stream first"} /></SelectTrigger>
                <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={generateStudent} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />} Generate Report Card
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Class Performance Report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Term</Label>
              <Select value={termId} onValueChange={setTermId}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{terms.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} {t.year}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Stream</Label>
              <Select value={streamId} onValueChange={setStreamId}><SelectTrigger><SelectValue placeholder="Stream" /></SelectTrigger>
                <SelectContent>{streams.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={generateClass} disabled={busy} variant="secondary" className="w-full">
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />} Generate Class Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
