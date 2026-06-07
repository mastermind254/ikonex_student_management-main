import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, FileDown } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const studentSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  admission_number: z.string().min(1, "Admission number is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  date_of_birth: z.string().optional().or(z.literal("")),
  stream_id: z.string().nullable(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — Ikonex Academy" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStream, setFilterStream] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      full_name: "",
      admission_number: "",
      gender: "OTHER",
      date_of_birth: "",
      stream_id: null,
    },
  });

  const { data: streams = [] } = useQuery({
    queryKey: ["streams-mini"],
    queryFn: async () => (await supabase.from("streams").select("id,name").order("name")).data ?? [],
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students", filterStream],
    queryFn: async () => {
      let q = supabase.from("students").select("*, streams(name)").order("full_name");
      if (filterStream !== "all") q = q.eq("stream_id", filterStream);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const onSubmit = async (values: StudentFormValues) => {
    const payload = { ...values, date_of_birth: values.date_of_birth || null, stream_id: values.stream_id || null };
    if (editingId) {
      const { error } = await supabase.from("students").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Student updated");
    } else {
      const { error } = await supabase.from("students").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Student registered");
    }
    setOpen(false);
    setEditingId(null);
    form.reset({ full_name: "", admission_number: "", gender: "OTHER", date_of_birth: "", stream_id: null });
    qc.invalidateQueries({ queryKey: ["students"] });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split("\n").filter(l => l.trim());
      const headers = lines[0].split(",");
      const data = lines.slice(1).map(line => {
        const values = line.split(",");
        return {
          full_name: values[0]?.trim(),
          admission_number: values[1]?.trim(),
          gender: (values[2]?.trim().toUpperCase() || "OTHER") as any,
          stream_id: null
        };
      }).filter(d => d.full_name && d.admission_number);

      const { error } = await supabase.from("students").insert(data);
      if (error) return toast.error(error.message);
      toast.success(`Successfully imported ${data.length} students`);
      setImportOpen(false);
      qc.invalidateQueries({ queryKey: ["students"] });
    };
    reader.readAsText(file);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Student deleted");
    qc.invalidateQueries({ queryKey: ["students"] });
  };

  const handleEdit = (st: any) => {
    setEditingId(st.id);
    form.reset({
      full_name: st.full_name,
      admission_number: st.admission_number,
      gender: st.gender,
      date_of_birth: st.date_of_birth ?? "",
      stream_id: st.stream_id,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Students</h2>
          <p className="text-muted-foreground">Register students and assign them to a class stream.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStream} onValueChange={setFilterStream}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All streams</SelectItem>
              {streams.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild><Button variant="outline"><Upload className="h-4 w-4 mr-1.5" /> Import CSV</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Students</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to register multiple students at once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground">
                  Upload a CSV file with the following columns: <br/>
                  <code className="bg-muted px-1 rounded">full_name, admission_number, gender (MALE/FEMALE)</code>
                </div>
                <Input type="file" accept=".csv" onChange={handleImport} />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={(v) => { 
            setOpen(v); 
            if (!v) { 
              setEditingId(null); 
              form.reset({ full_name: "", admission_number: "", gender: "OTHER", date_of_birth: "", stream_id: null }); 
            } 
          }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Add Student</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit student" : "Register student"}</DialogTitle>
                <DialogDescription>
                  Enter the student's details below to {editingId ? "update their" : "create a new"} record.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="admission_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admission number</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of birth</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stream_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stream</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} defaultValue={field.value ?? "none"}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {streams.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Adm. No.</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && students.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No students yet.</TableCell></TableRow>}
              {students.map((st: any) => (
                <TableRow key={st.id}>
                  <TableCell className="font-medium">
                    <Link 
                      to="/students/$studentId" 
                      params={{ studentId: st.id }}
                      className="text-primary hover:underline"
                    >
                      {st.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{st.admission_number}</TableCell>
                  <TableCell>{st.gender}</TableCell>
                  <TableCell>{st.streams?.name ? <Badge variant="secondary">{st.streams.name}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(st)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete {st.full_name}?</AlertDialogTitle><AlertDialogDescription>All scores for this student will also be removed.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(st.id)}>Delete</AlertDialogAction></AlertDialogFooter>
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
