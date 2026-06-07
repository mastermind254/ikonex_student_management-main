import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, ShieldCheck, Mail, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Access Control — Ikonex Academy" }] }),
  component: UserManagementPage,
});

function UserManagementPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "TEACHER" as "ADMIN" | "TEACHER" | "BURSAR",
  });

  const { data: authorizations = [] } = useQuery({
    queryKey: ["staff-authorizations"],
    queryFn: async () => (await supabase.from("authorized_staff").select("*").order("email")).data ?? [],
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["active-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("full_name")).data ?? [],
  });

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Explicitly send the current form state to ensure role is included
    const { error } = await supabase.from("authorized_staff").insert([{
      email: form.email.trim().toLowerCase(),
      full_name: form.full_name,
      role: form.role
    }]);
    
    setLoading(false);
    
    if (error) {
      if (error.code === "23505") return toast.error("Email already authorized");
      return toast.error(error.message);
    }

    toast.success(`Authorized ${form.email} as ${form.role}`);
    setOpen(false);
    setForm({ email: "", full_name: "", role: "TEACHER" });
    qc.invalidateQueries({ queryKey: ["staff-authorizations"] });
  };

  const updateProfileRole = async (id: string, newRole: string) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["active-profiles"] });
  };

  const removeAuthorization = async (email: string) => {
    const { error } = await supabase.from("authorized_staff").delete().eq("email", email);
    if (error) return toast.error(error.message);
    toast.success("Authorization removed");
    qc.invalidateQueries({ queryKey: ["staff-authorizations"] });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Access Control</h2>
          <p className="text-muted-foreground">Manage authorized staff and active user permissions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-bold"><UserPlus className="h-4 w-4 mr-1.5" /> Authorize Email</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Authorize Staff Email</DialogTitle>
              <DialogDescription>Allow a specific email to sign up and receive a role.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAuthorize} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="e.g. John Doe" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" placeholder="name@ikonex.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>System Role</Label>
                <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="BURSAR">Bursar</SelectItem>
                    <SelectItem value="ADMIN">System Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Saving..." : "Authorize Email"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm bg-muted/10">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">Active Profiles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
              <TableBody>
                {profiles.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold">{p.full_name}</TableCell>
                    <TableCell>
                      <Select defaultValue={p.role} onValueChange={(v) => updateProfileRole(p.id, v)}>
                        <SelectTrigger className="h-8 w-32 border-none bg-transparent font-bold text-xs uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                          <SelectItem value="TEACHER">TEACHER</SelectItem>
                          <SelectItem value="BURSAR">BURSAR</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">Pending Authorizations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {authorizations.map((auth: any) => (
                  <TableRow key={auth.email}>
                    <TableCell className="text-xs">{auth.email}</TableCell>
                    <TableCell><Badge variant="secondary">{auth.role}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => removeAuthorization(auth.email)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
