import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Ikonex Academy" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [termName, setTermName] = useState("");
  const [termYear, setTermYear] = useState<number>(new Date().getFullYear());
  const [g, setG] = useState({ min: "", max: "", grade: "", remarks: "" });

  const { data: terms = [] } = useQuery({ queryKey: ["terms"], queryFn: async () => (await supabase.from("terms").select("*").order("year", { ascending: false })).data ?? [] });
  const { data: scales = [] } = useQuery({ queryKey: ["grading-scales"], queryFn: async () => (await supabase.from("grading_scales").select("*").order("min_score", { ascending: false })).data ?? [] });

  const addTerm = async () => {
    if (!termName.trim()) return toast.error("Term name required");
    const { error } = await supabase.from("terms").insert({ name: termName, year: termYear });
    if (error) return toast.error(error.message);
    setTermName(""); qc.invalidateQueries({ queryKey: ["terms"] }); toast.success("Term added");
  };
  const toggleActive = async (id: string, active: boolean) => {
    if (active) await supabase.from("terms").update({ is_active: false }).neq("id", id);
    await supabase.from("terms").update({ is_active: active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["terms"] });
  };
  const removeTerm = async (id: string) => {
    const { error } = await supabase.from("terms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["terms"] });
  };
  const addScale = async () => {
    const min = Number(g.min), max = Number(g.max);
    if (Number.isNaN(min) || Number.isNaN(max) || !g.grade.trim()) return toast.error("Min, max and grade required");
    const { error } = await supabase.from("grading_scales").insert({ min_score: min, max_score: max, grade: g.grade, remarks: g.remarks || null });
    if (error) return toast.error(error.message);
    setG({ min: "", max: "", grade: "", remarks: "" }); qc.invalidateQueries({ queryKey: ["grading-scales"] });
  };
  const removeScale = async (id: string) => {
    await supabase.from("grading_scales").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["grading-scales"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Academic terms and grading scales.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Academic Terms</CardTitle><CardDescription>Only one term can be active at a time.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-2"><Label>Name</Label><Input placeholder="Term 2" value={termName} onChange={(e) => setTermName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Year</Label><Input type="number" value={termYear} onChange={(e) => setTermYear(Number(e.target.value))} className="w-28" /></div>
            <Button onClick={addTerm}><Plus className="h-4 w-4 mr-1.5" /> Add Term</Button>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Year</TableHead><TableHead>Active</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
            <TableBody>
              {terms.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.year}</TableCell>
                  <TableCell><Switch checked={t.is_active} onCheckedChange={(c) => toggleActive(t.id, c)} /></TableCell>
                  <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => removeTerm(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Grading Scale</CardTitle><CardDescription>Define grade bands. Scores are mapped to the band where min ≤ score ≤ max.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <div className="space-y-2"><Label>Min</Label><Input type="number" value={g.min} onChange={(e) => setG({ ...g, min: e.target.value })} /></div>
            <div className="space-y-2"><Label>Max</Label><Input type="number" value={g.max} onChange={(e) => setG({ ...g, max: e.target.value })} /></div>
            <div className="space-y-2"><Label>Grade</Label><Input value={g.grade} onChange={(e) => setG({ ...g, grade: e.target.value })} placeholder="A" /></div>
            <div className="space-y-2"><Label>Remarks</Label><Input value={g.remarks} onChange={(e) => setG({ ...g, remarks: e.target.value })} placeholder="Excellent" /></div>
            <Button onClick={addScale}><Plus className="h-4 w-4 mr-1.5" /> Add</Button>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Range</TableHead><TableHead>Grade</TableHead><TableHead>Remarks</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
            <TableBody>
              {scales.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{Number(s.min_score)} – {Number(s.max_score)}</TableCell>
                  <TableCell className="font-medium">{s.grade}</TableCell>
                  <TableCell className="text-muted-foreground">{s.remarks ?? "—"}</TableCell>
                  <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => removeScale(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
