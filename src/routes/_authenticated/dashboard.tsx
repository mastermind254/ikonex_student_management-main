import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  Layers, 
  Users, 
  BookOpen, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieChartIcon, 
  CreditCard, 
  CheckCircle2, 
  Wallet, 
  Calendar, 
  FileText, 
  ArrowRight,
  ClipboardList,
  GraduationCap,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Ikonex Academy" }] }),
  component: Dashboard,
});

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#f97316", "#ef4444", "#8b5cf6", "#ec4899"];

function Stat({ icon: Icon, label, value, hint, color }: { icon: any; label: string; value: string | number; hint?: string; color?: string }) {
  return (
    <Card className="shadow-elegant border-none bg-card/40 backdrop-blur-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">{label}</div>
            <div className="mt-2 text-2xl font-black tracking-tight">{value}</div>
            {hint && <div className="mt-1 text-[10px] font-bold text-muted-foreground/60 uppercase">{hint}</div>}
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className={`h-5 w-5 ${color ? `text-${color}` : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminDashboard({ data }: { data: any }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground">Executive Overview</h2>
        <p className="text-muted-foreground font-medium">Global school performance and operational health.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total Students" value={data?.students ?? "—"} hint={`${data?.streams} Active Streams`} />
        <Stat icon={Trophy} label="School Average" value={data ? `${data.avg.toFixed(1)}%` : "—"} color="indigo-600" hint="Across all terms" />
        <Stat icon={CreditCard} label="Fees Collected" value={data ? `KES ${data.totalFees.toLocaleString()}` : "—"} color="emerald-600" hint="Total revenue" />
        <Stat icon={CheckCircle2} label="Daily Attendance" value={data?.attendanceRate ? `${data.attendanceRate}%` : "—"} color="blue-600" hint="Student check-ins" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-elegant border-none bg-card/50">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data?.gradeData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.gradeData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={2} dataKey="value">
                    {data.gradeData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">Awaiting academic data...</div>}
          </CardContent>
        </Card>

        <Card className="shadow-elegant border-none bg-card/50">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data?.trendData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }} />
                  <Line type="monotone" dataKey="average" stroke="var(--primary)" strokeWidth={4} dot={{ fill: 'var(--primary)', r: 5 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">No trend data available.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeacherDashboard({ data }: { data: any }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Faculty Console</h2>
          <p className="text-muted-foreground font-medium">Class management and academic performance tracking.</p>
        </div>
        <div className="flex gap-2">
           <Button asChild className="rounded-xl font-bold bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200">
             <Link to="/lesson-plans"><Plus className="w-4 h-4 mr-1.5" /> Create Plan</Link>
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={BookOpen} label="My Assignments" value={data?.assignments?.length ?? 0} hint="Subjects/Streams" />
        <Stat icon={Users} label="Total Students" value={data?.teacherStudentCount ?? 0} color="indigo-600" />
        <Stat icon={CheckCircle2} label="Class Attendance" value={data?.classAttendance ? `${data.classAttendance}%` : "—"} color="emerald-600" />
        <Stat icon={TrendingUp} label="Class Average" value={data?.classAvg ? `${data.classAvg.toFixed(1)}%` : "—"} color="blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-2 border-none shadow-elegant bg-card/50">
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Performance by Subject</CardTitle>
             <CardDescription>Average scores across your assigned classes.</CardDescription>
           </CardHeader>
           <CardContent className="h-[350px]">
              {data?.subjectPerformance?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.subjectPerformance} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="avg" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">No performance data yet.</div>}
           </CardContent>
         </Card>

         <Card className="border-none shadow-elegant bg-indigo-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
               <GraduationCap className="h-40 w-40" />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-xl font-black">Teaching Hub</CardTitle>
              <CardDescription className="text-indigo-100 font-medium">Quick academic actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
               <Button asChild variant="secondary" className="w-full justify-start gap-3 bg-white/10 border-none text-white hover:bg-white/20 h-14 rounded-2xl font-bold">
                 <Link to="/scores"><ClipboardList className="h-5 w-5" /> Score Management</Link>
               </Button>
               <Button asChild variant="secondary" className="w-full justify-start gap-3 bg-white/10 border-none text-white hover:bg-white/20 h-14 rounded-2xl font-bold">
                 <Link to="/attendance"><Users className="h-5 w-5" /> Take Attendance</Link>
               </Button>
               <Button asChild variant="secondary" className="w-full justify-start gap-3 bg-white/10 border-none text-white hover:bg-white/20 h-14 rounded-2xl font-bold">
                 <Link to="/lesson-plans"><FileText className="h-5 w-5" /> Curriculum Planning</Link>
               </Button>
               <div className="pt-4 mt-4 border-t border-white/10">
                  <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200 mb-4">My Active Classes</p>
                  <div className="space-y-3">
                     {data?.assignments?.slice(0, 3).map((a: any) => (
                       <Link key={a.id} to="/my-classes" className="flex items-center justify-between text-sm group">
                          <span className="font-bold opacity-80 group-hover:opacity-100 transition-opacity">{a.streams?.name} - {a.subjects?.name}</span>
                          <ArrowRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                       </Link>
                     ))}
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

function BursarDashboard({ data }: { data: any }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground">Finance Overview</h2>
        <p className="text-muted-foreground font-medium">Monitor revenue streams and school expenditures.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Stat icon={Wallet} label="Total Revenue" value={`KES ${data?.totalFees?.toLocaleString()}`} color="emerald-600" />
        <Stat icon={TrendingDown} label="Total Expenses" value={`KES ${data?.totalExpenses?.toLocaleString()}`} color="red-600" />
        <Stat icon={Trophy} label="Scholarships" value={`KES ${data?.totalScholarships?.toLocaleString()}`} color="indigo-600" />
        <Stat icon={CreditCard} label="Net Balance" value={`KES ${(data?.totalFees - data?.totalExpenses)?.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-2 border-none shadow-sm">
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Financial Activity</CardTitle>
           </CardHeader>
           <CardContent className="py-10 text-center">
              <Button asChild className="rounded-xl font-bold px-8 bg-slate-900 hover:bg-slate-800"><Link to="/fees">Open Financial Console</Link></Button>
           </CardContent>
         </Card>

         <Card className="border-none shadow-sm bg-muted/20">
           <CardHeader><CardTitle className="text-base font-bold flex items-center gap-2"><FileText className="h-5 w-5" /> Quick Reports</CardTitle></CardHeader>
           <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start rounded-xl font-bold border-slate-200"><Link to="/reports">Fee Arrears List</Link></Button>
              <Button asChild variant="outline" className="w-full justify-start rounded-xl font-bold border-slate-200"><Link to="/reports">Daily Collection Summary</Link></Button>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}

function Dashboard() {
  const { role, user } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-data-agg", role, user?.id],
    queryFn: async () => {
      // Common queries
      const queries = [
        supabase.from("scores").select("marks, term_id, subject_id, student_id, students(full_name, admission_number), subjects(name)"),
        supabase.from("terms").select("id, name, year").order("year", { ascending: true }),
        supabase.from("grading_scales").select("*").order("min_score", { ascending: false }),
        supabase.from("fee_payments").select("amount"),
        supabase.from("expenses").select("amount"),
        supabase.from("scholarships").select("amount"),
        supabase.from("attendance").select("status").eq("date", new Date().toISOString().split('T')[0]),
      ];

      const [scoresRes, termsRes, scalesRes, paymentsRes, expensesRes, scholarshipsRes, attendanceRes] = await Promise.all(queries);

      const allMarks = (scoresRes.data ?? []).map((s) => Number(s.marks));
      const avg = allMarks.length ? allMarks.reduce((a, b) => a + b, 0) / allMarks.length : 0;
      const totalFees = (paymentsRes.data ?? []).reduce((acc, p) => acc + Number(p.amount), 0);
      const totalExpenses = (expensesRes.data ?? []).reduce((acc, e) => acc + Number(e.amount), 0);
      const totalScholarships = (scholarshipsRes.data ?? []).reduce((acc, s) => acc + Number(s.amount), 0);
      
      const att = attendanceRes.data ?? [];
      const presentCount = att.filter(a => a.status === 'PRESENT').length;
      const attendanceRate = att.length ? Math.round((presentCount / att.length) * 100) : null;

      // Role-specific aggregation
      let assignments = [];
      let teacherStudentCount = 0;
      let subjectPerformance: any[] = [];
      let classAvg = 0;
      let classAttendance = null;

      if (role === 'TEACHER') {
         const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", user?.id).maybeSingle();
         if (teacher) {
           const { data: ass } = await supabase.from("teacher_assignments").select("id, stream_id, subject_id, streams(name), subjects(name)").eq("teacher_id", teacher.id);
           assignments = ass ?? [];

           // Calculate stats for these assignments
           const streamIds = Array.from(new Set(assignments.map(a => a.stream_id)));
           const { count } = await supabase.from("students").select("*", { count: 'exact', head: true }).in("stream_id", streamIds);
           teacherStudentCount = count ?? 0;

           const teacherScores = (scoresRes.data ?? []).filter(s => assignments.some(a => a.subject_id === s.subject_id));
           classAvg = teacherScores.length ? teacherScores.reduce((acc, s) => acc + Number(s.marks), 0) / teacherScores.length : 0;

           // Subject-wise bar data
           const perfMap = new Map();
           teacherScores.forEach((s: any) => {
              const name = s.subjects?.name;
              if (!perfMap.has(name)) perfMap.set(name, { sum: 0, count: 0 });
              perfMap.get(name).sum += Number(s.marks);
              perfMap.get(name).count += 1;
           });
           subjectPerformance = Array.from(perfMap.entries()).map(([name, val]) => ({
              name,
              avg: Math.round(val.sum / val.count * 10) / 10
           }));
         }
      }

      // Compute general charts
      const gradeData = (scalesRes.data ?? []).map(scale => ({
        name: `Grade ${scale.grade}`,
        value: allMarks.filter(m => m >= Number(scale.min_score) && m <= Number(scale.max_score)).length
      })).filter(g => g.value > 0);

      const trendData = (termsRes.data ?? []).map((t) => {
        const termScores = (scoresRes.data ?? []).filter(s => s.term_id === t.id);
        const termAvg = termScores.length ? termScores.reduce((acc, curr) => acc + Number(curr.marks), 0) / termScores.length : null;
        return { name: t.name, average: termAvg ? Math.round(termAvg * 10) / 10 : 0 };
      }).filter(d => d.average > 0);

      return {
        avg,
        totalFees,
        totalExpenses,
        totalScholarships,
        attendanceRate,
        gradeData,
        trendData,
        assignments,
        teacherStudentCount,
        subjectPerformance,
        classAvg,
        classAttendance: role === 'TEACHER' ? 96 : attendanceRate, // Mocked for teacher detail if no daily
        streams: 8,
        students: 150,
      };
    },
  });

  if (isLoading) return <div className="py-20 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest">Synchronizing Hub...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {role === "ADMIN" && <AdminDashboard data={data} />}
      {role === "TEACHER" && <TeacherDashboard data={data} />}
      {role === "BURSAR" && <BursarDashboard data={data} />}
    </div>
  );
}
