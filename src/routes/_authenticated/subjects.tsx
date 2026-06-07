import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const subjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(1, "Code is required").max(10, "Code too long"),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({ meta: [{ title: "Subjects — Ikonex Academy" }] }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", code: "" },
  });

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*, stream_subjects(stream_id, streams(id,name))").order("name")).data ?? [],
  });
  const { data: streams = [] } = useQuery({
    queryKey: ["streams-mini"],
    queryFn: async () => (await supabase.from("streams").select("id,name").order("name")).data ?? [],
  });

  const onSubmit = async (values: SubjectFormValues) => {
    if (editingId) {
      const { error } = await supabase.from("subjects").update(values).eq("id", editingId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("subjects").insert(values);
      if (error) return toast.error(error.message);
    }
    toast.success("Subject saved");
    setOpen(false);
    setEditingId(null);
    form.reset({ name: "", code: "" });
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["subjects"] });
    toast.success("Subject deleted");
  };

  const toggleAssign = async (subjectId: string, streamId: string, on: boolean) => {
    if (on) {
      await supabase.from("stream_subjects").insert({ subject_id: subjectId, stream_id: streamId });
    } else {
      await supabase.from("stream_subjects").delete().eq("subject_id", subjectId).eq("stream_id", streamId);
    }
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    form.reset({ name: s.name, code: s.code });
    setOpen(true);
  };

  const activeSubject = subjects.find((s: any) => s.id === assignOpen);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Subjects</h2>
          <p className="text-muted-foreground">Create subjects and assign them to streams.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); form.reset({ name: "", code: "" }); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Add Subject</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit subject" : "New subject"}</DialogTitle>
              <DialogDescription>Create a new subject or update an existing one.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="Mathematics" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl><Input placeholder="MATH" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Streams</TableHead><TableHead className="w-32" /></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && subjects.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No subjects yet.</TableCell></TableRow>}
              {subjects.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="outline">{s.code}</Badge></TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{s.stream_subjects?.map((ss: any) => <Badge key={ss.streams.id} variant="secondary">{ss.streams.name}</Badge>) ?? null}</div></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setAssignOpen(s.id)}><Layers className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete {s.name}?</AlertDialogTitle><AlertDialogDescription>Associated scores will also be removed. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(s.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!assignOpen} onOpenChange={(v) => !v && setAssignOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to streams</DialogTitle>
            <DialogDescription>Select the classes where this subject is taught.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-auto">
            {streams.map((stream: any) => {
              const assigned = activeSubject?.stream_subjects?.some((ss: any) => ss.stream_id === stream.id);
              return (
                <label key={stream.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer">
                  <Checkbox checked={assigned} onCheckedChange={(c) => activeSubject && toggleAssign(activeSubject.id, stream.id, !!c)} />
                  <span>{stream.name}</span>
                </label>
              );
            })}
            {streams.length === 0 && <p className="text-sm text-muted-foreground">No streams yet — create one first.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
