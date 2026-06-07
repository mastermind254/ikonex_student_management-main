import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { buildStudentSubjectSummaries, competitionRank, gradeFor } from "@/lib/results";

export const Route = createFileRoute("/_authenticated/results")({
  head: () => ({ meta: [{ title: "Results — Ikonex Academy" }] }),
  component: ResultsPage,
});

function ResultsPage() {
  const [termId, setTermId] = useState("");
  const [streamId, setStreamId] = useState("");

  const { data: terms = [] } = useQuery({ queryKey: ["terms"], queryFn: async () => (await supabase.from("terms").select("*").order("year", { ascending: false })).data ?? [] });
  const { data: streams = [] } = useQuery({ queryKey: ["streams-mini"], queryFn: async () => (await supabase.from("streams").select("id,name").order("name")).data ?? [] });
  useEffect(() => { if (!termId && terms.length) setTermId((terms.find((t: any) => t.is_active) ?? terms[0]).id); }, [terms, termId]);
  useEffect(() => { if (!streamId && streams.length) setStreamId(streams[0].id); }, [streams, streamId]);

  const { data: students = [] } = useQuery({
    queryKey: ["stream-students", streamId],
    enabled: !!streamId,
    queryFn: async () => (await supabase.from("students").select("id, full_name, admission_number").eq("stream_id", streamId)).data ?? [],
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["stream-subjects", streamId],
    enabled: !!streamId,
    queryFn: async () => {
      const { data } = await supabase.from("stream_subjects").select("subjects(id,name,code)").eq("stream_id", streamId);
      return (data ?? []).map((r: any) => r.subjects).filter(Boolean);
    },
  });
  const { data: scores = [] } = useQuery({
    queryKey: ["scores-for-results", termId, streamId, students.map((s: any) => s.id).join(",")],
    enabled: !!termId && students.length > 0,
    queryFn: async () => (await supabase.from("scores").select("*").eq("term_id", termId).in("student_id", students.map((s: any) => s.id))).data ?? [],
  });
  const { data: scales = [] } = useQuery({
    queryKey: ["grading-scales"],
    queryFn: async () => (await supabase.from("grading_scales").select("*").order("min_score", { ascending: false })).data ?? [],
  });

  const summaries = useMemo(() => buildStudentSubjectSummaries(scores as any), [scores]);

  // Overall: total + average per student
  const overall = useMemo(() => {
    return students.map((st: any) => {
      const subs = summaries.filter((s) => s.studentId === st.id);
      const total = subs.reduce((sum, s) => sum + s.total, 0);
      const avg = subs.length ? total / subs.length : 0;
      const g = gradeFor(avg, scales as any);
      return { student: st, total, avg, grade: g?.grade ?? "—", remarks: g?.remarks ?? "" };
    });
  }, [students, summaries, scales]);

  const overallRanks = useMemo(() => competitionRank(overall, (o) => o.total), [overall]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Results &amp; Rankings</h2>
        <p className="text-muted-foreground">Auto-calculated totals, averages, grades and class positions.</p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          <div className="space-y-2"><Label>Term</Label>
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
              <SelectContent>{terms.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} {t.year}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Stream</Label>
            <Select value={streamId} onValueChange={setStreamId}>
              <SelectTrigger><SelectValue placeholder="Stream" /></SelectTrigger>
              <SelectContent>{streams.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overall">
        <TabsList>
          <TabsTrigger value="overall">Overall Ranking</TabsTrigger>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
        </TabsList>
        <TabsContent value="overall">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead className="w-16">Pos</TableHead><TableHead>Student</TableHead><TableHead>Adm.</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Average</TableHead><TableHead>Grade</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
              <TableBody>
                {overall.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No results to display.</TableCell></TableRow>}
                {[...overall].sort((a, b) => b.total - a.total).map((o) => (
                  <TableRow key={o.student.id}>
                    <TableCell><Badge variant="secondary">{overallRanks.get(o)}</Badge></TableCell>
                    <TableCell className="font-medium">{o.student.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{o.student.admission_number}</TableCell>
                    <TableCell className="text-right">{o.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{o.avg.toFixed(2)}</TableCell>
                    <TableCell><Badge>{o.grade}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{o.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="subjects" className="space-y-6">
          {subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects assigned to this stream.</p>}
          {subjects.map((subj: any) => {
            const rows = students.map((st: any) => {
              const s = summaries.find((x) => x.studentId === st.id && x.subjectId === subj.id);
              return { student: st, total: s?.total ?? 0, cat1: s?.cat1, cat2: s?.cat2, exam: s?.exam };
            }).filter((r) => r.cat1 != null || r.cat2 != null || r.exam != null);
            const ranks = competitionRank(rows, (r) => r.total);
            return (
              <Card key={subj.id}>
                <CardHeader><CardTitle className="text-base">{subj.name} <span className="text-muted-foreground font-normal">({subj.code})</span></CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-14">Pos</TableHead><TableHead>Student</TableHead><TableHead className="text-right">CAT1</TableHead><TableHead className="text-right">CAT2</TableHead><TableHead className="text-right">EXAM</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground text-sm">No scores entered.</TableCell></TableRow>}
                      {[...rows].sort((a, b) => b.total - a.total).map((r) => {
                        const g = gradeFor(r.total, scales as any);
                        return (
                          <TableRow key={r.student.id}>
                            <TableCell><Badge variant="secondary">{ranks.get(r)}</Badge></TableCell>
                            <TableCell>{r.student.full_name}</TableCell>
                            <TableCell className="text-right">{r.cat1 ?? "—"}</TableCell>
                            <TableCell className="text-right">{r.cat2 ?? "—"}</TableCell>
                            <TableCell className="text-right">{r.exam ?? "—"}</TableCell>
                            <TableCell className="text-right font-medium">{r.total.toFixed(2)}</TableCell>
                            <TableCell><Badge>{g?.grade ?? "—"}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
