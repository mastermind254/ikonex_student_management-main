import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BookOpen, Trash2, Calendar, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/lesson-plans")({
  head: () => ({ meta: [{ title: "Lesson Plans — Ikonex Academy" }] }),
  component: LessonPlansPage,
});

function LessonPlansPage() {
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    stream_id: "",
    subject_id: "",
    term_id: "",
    week_number: 1,
    title: "",
    objectives: "",
    content: "",
    resources: "",
  });

  const { data: teacher } = useQuery({
    queryKey: ["current-teacher", user.id],
    queryFn: async () => (await supabase.from("teachers").select("id").eq("profile_id", user.id).maybeSingle()).data,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["my-lesson-plans", teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_plans")
        .select("*, streams(name), subjects(name), terms(name)")
        .eq("teacher_id", teacher!.id)
        .order("week_number", { ascending: false });
      return data ?? [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["my-assignments-simple", teacher?.id],
    enabled: !!teacher?.id,
    queryFn: async () => {
      const { data } = await supabase.from("teacher_assignments").select("stream_id, subject_id, streams(name), subjects(name)").eq("teacher_id", teacher!.id);
      return data ?? [];
    },
  });

  const { data: terms = [] } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => (await supabase.from("terms").select("*").order("year", { ascending: false })).data ?? [],
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return toast.error("Teacher record not found");
    
    const { error } = await supabase.from("lesson_plans").insert([{
      ...form,
      teacher_id: teacher.id
    }]);

    if (error) return toast.error(error.message);
    
    toast.success("Lesson plan saved");
    setOpen(false);
    setForm({ stream_id: "", subject_id: "", term_id: "", week_number: 1, title: "", objectives: "", content: "", resources: "" });
    qc.invalidateQueries({ queryKey: ["my-lesson-plans"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Lesson Plans</h2>
          <p className="text-muted-foreground">Draft and organize your weekly teaching content.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!teacher}><Plus className="h-4 w-4 mr-1.5" /> New Lesson Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Lesson Plan</DialogTitle>
              <DialogDescription>Define objectives and content for your upcoming classes.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class & Subject</Label>
                  <Select onValueChange={(v) => {
                    const [sid, subid] = v.split("|");
                    setForm({ ...form, stream_id: sid, subject_id: subid });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select assignment" /></SelectTrigger>
                    <SelectContent>
                      {assignments.map((a: any) => (
                        <SelectItem key={`${a.stream_id}|${a.subject_id}`} value={`${a.stream_id}|${a.subject_id}`}>
                          {a.streams.name} - {a.subjects.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select onValueChange={(v) => setForm({ ...form, term_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                    <SelectContent>
                      {terms.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} {t.year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label>Week No.</Label>
                  <Input type="number" value={form.week_number} onChange={(e) => setForm({ ...form, week_number: Number(e.target.value) })} />
                </div>
                <div className="space-y-2 col-span-3">
                  <Label>Lesson Title</Label>
                  <Input placeholder="e.g. Introduction to Calculus" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Learning Objectives</Label>
                <Textarea placeholder="What should students learn?" value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Lesson Content / Notes</Label>
                <Textarea className="min-h-[150px]" placeholder="Outline the lesson flow..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Resources / Materials</Label>
                <Input placeholder="e.g. Textbooks, projector, lab equipment" value={form.resources} onChange={(e) => setForm({ ...form, resources: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Save Plan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
             <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
             <h3 className="text-lg font-semibold">No Lesson Plans Yet</h3>
             <p className="text-muted-foreground">Start by creating your first plan for the current term.</p>
          </div>
        ) : (
          plans.map((p: any) => (
            <Card key={p.id} className="group hover:shadow-md transition-shadow border-primary/10">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                   <Badge variant="outline">Week {p.week_number}</Badge>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                     <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                   </div>
                </div>
                <CardTitle className="text-lg leading-tight line-clamp-1">{p.title}</CardTitle>
                <CardDescription className="flex items-center gap-1.5 pt-1">
                  <FileText className="h-3 w-3" /> {p.subjects?.name} • {p.streams?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {p.objectives || "No objectives defined."}
                </p>
                <div className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest gap-2">
                  <Calendar className="h-3 w-3" /> Created {new Date(p.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
