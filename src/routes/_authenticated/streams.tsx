import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const streamSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional().or(z.literal("")),
});

type StreamFormValues = z.infer<typeof streamSchema>;

export const Route = createFileRoute("/_authenticated/streams")({
  head: () => ({ meta: [{ title: "Class Streams — Ikonex Academy" }] }),
  component: StreamsPage,
});

function StreamsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<StreamFormValues>({
    resolver: zodResolver(streamSchema),
    defaultValues: { name: "", description: "" },
  });

  const { data: streams = [], isLoading } = useQuery({
    queryKey: ["streams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("streams").select("*, students(count), stream_subjects(count)").order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const onSubmit = async (values: StreamFormValues) => {
    if (editingId) {
      const { error } = await supabase.from("streams").update(values).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Stream updated");
    } else {
      const { error } = await supabase.from("streams").insert(values);
      if (error) return toast.error(error.message);
      toast.success("Stream created");
    }
    setOpen(false);
    setEditingId(null);
    form.reset({ name: "", description: "" });
    qc.invalidateQueries({ queryKey: ["streams"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("streams").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Stream deleted");
    qc.invalidateQueries({ queryKey: ["streams"] });
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    form.reset({ name: s.name, description: s.description ?? "" });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Class Streams</h2>
          <p className="text-muted-foreground">Create and manage class streams (e.g. Form 1A).</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { 
          setOpen(v); 
          if (!v) { setEditingId(null); form.reset({ name: "", description: "" }); } 
        }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Add Stream</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit stream" : "New stream"}</DialogTitle>
              <DialogDescription>Define a class stream name and optional description.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="Form 1A" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Optional" {...field} /></FormControl>
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
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Subjects</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && streams.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No streams yet.</TableCell></TableRow>}
              {streams.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.description ?? "—"}</TableCell>
                  <TableCell className="text-right">{s.students?.[0]?.count ?? 0}</TableCell>
                  <TableCell className="text-right">{s.stream_subjects?.[0]?.count ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete {s.name}?</AlertDialogTitle><AlertDialogDescription>Students in this stream will be unassigned. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
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
    </div>
  );
}
