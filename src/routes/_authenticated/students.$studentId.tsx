import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Calendar, BookOpen, CreditCard, TrendingUp, CheckCircle2, XCircle, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  head: () => ({ meta: [{ title: "Student Profile — Ikonex Academy" }] }),
  component: StudentProfile,
});

function StudentProfile() {
  const { studentId } = Route.useParams();

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*, streams(name)").eq("id", studentId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["student-scores", studentId],
    queryFn: async () => {
      const { data } = await supabase.from("scores").select("*, subjects(name, code), terms(name, year)").eq("student_id", studentId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["student-payments", studentId],
    queryFn: async () => {
      const { data } = await supabase.from("fee_payments").select("*").eq("student_id", studentId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["student-attendance", studentId],
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*").eq("student_id", studentId).order("date", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground animate-pulse text-lg">Gathering academic records...</div>;
  if (!student) return <div className="py-20 text-center text-destructive font-semibold">Student not found</div>;

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  
  // Performance Trends (Avg per term)
  const termMap = new Map<string, { name: string; sum: number; count: number }>();
  scores.forEach((s: any) => {
    const key = s.term_id;
    const existing = termMap.get(key) || { name: s.terms?.name, sum: 0, count: 0 };
    existing.sum += Number(s.marks);
    existing.count += 1;
    termMap.set(key, existing);
  });
  const trendData = Array.from(termMap.values()).map(t => ({
    name: t.name,
    avg: Math.round(t.sum / t.count)
  }));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'ABSENT': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'LATE': return <Clock className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start bg-card/30 p-6 rounded-3xl border border-border/50">
        <div className="h-32 w-32 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground text-5xl font-bold shrink-0 shadow-lg shadow-primary/20">
          {student.full_name.charAt(0)}
        </div>
        <div className="space-y-4 flex-1 text-center md:text-left">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">{student.full_name}</h1>
            <p className="text-muted-foreground text-lg mt-1">{student.streams?.name || "Unassigned Class"}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <Badge variant="outline" className="text-sm py-1 px-4 rounded-full border-primary/20 bg-primary/5 text-primary font-medium">
              ID: {student.admission_number}
            </Badge>
            <Badge variant="secondary" className="text-sm py-1 px-4 rounded-full capitalize">
              {student.gender.toLowerCase()}
            </Badge>
            {student.date_of_birth && (
              <Badge variant="outline" className="text-sm py-1 px-4 rounded-full">
                Born: {new Date(student.date_of_birth).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 min-w-[200px]">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
            <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Fees Status</div>
            <div className="text-xl font-bold text-emerald-700">KES {totalPaid.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-600 mt-1 italic">Total payments recorded</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-accent/50 pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Performance Trajectory
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] pt-6">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
                    <Line type="monotone" dataKey="avg" stroke="var(--primary)" strokeWidth={3} dot={{ fill: 'var(--primary)', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                  Insufficient data to map performance trends.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Academic Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Term</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No score records found for this student.</TableCell></TableRow>}
                  {scores.map((s: any) => (
                    <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-sm font-medium">{s.terms?.name}</TableCell>
                      <TableCell className="text-sm">{s.subjects?.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] uppercase">{s.assessment_type}</Badge></TableCell>
                      <TableCell className="text-right font-bold text-foreground">{s.marks}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Attendance Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendance.length > 0 ? (
                  attendance.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(a.status)}
                        <span className="text-sm font-medium">{new Date(a.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      </div>
                      <span className="text-xs font-bold uppercase text-muted-foreground">{a.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground italic text-sm border-2 border-dashed rounded-xl">
                    No recent attendance logs.
                  </div>
                )}
                {attendance.length > 0 && (
                  <Button variant="link" className="w-full text-xs text-primary font-bold uppercase tracking-widest">
                    View Full History
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {payments.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-semibold">KES {p.amount.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{p.method} • {p.reference || 'NO REF'}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                {payments.length === 0 && <div className="text-sm italic text-muted-foreground text-center py-6">No payments recorded.</div>}
              </div>
              {payments.length > 5 && <Button variant="ghost" className="w-full text-xs" size="sm">See All Transactions</Button>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
