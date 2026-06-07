import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Plus, CreditCard, Search, Wallet, TrendingDown, Receipt, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildReceipt } from "@/components/pdf/receipt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/fees")({
  head: () => ({ meta: [{ title: "Finance — Ikonex Academy" }] }),
  component: FeeManagementPage,
});

function FeeManagementPage() {
  const qc = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [scholarshipOpen, setScholarshipOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [expenseForm, setExpenseForm] = useState({ category: "SUPPLIES", amount: "", description: "" });
  const [scholarshipForm, setScholarshipForm] = useState({ amount: "", description: "" });
  const [search, setSearch] = useState("");

  const { data: structures = [] } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: async () => (await supabase.from("fee_structures").select("*, streams(name), terms(name, year)")).data ?? [],
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-search", search],
    enabled: search.length > 2,
    queryFn: async () => (await supabase.from("students").select("id, full_name, admission_number").ilike("full_name", `%${search}%`).limit(10)).data ?? [],
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["fee-payments"],
    queryFn: async () => (await supabase.from("fee_payments").select("*, students(full_name, admission_number)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["school-expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(50)).data ?? [],
  });

  const { data: scholarships = [] } = useQuery({
    queryKey: ["student-scholarships"],
    queryFn: async () => (await supabase.from("scholarships").select("*, students(full_name, admission_number)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const recordPayment = async () => {
    if (!selectedStudent || !amount) return toast.error("Please select a student and amount");
    const { error } = await supabase.from("fee_payments").insert({
      student_id: selectedStudent,
      amount: Number(amount),
      method: "MPESA", 
    });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    setPaymentOpen(false); setSelectedStudent(""); setAmount(""); setSearch("");
    qc.invalidateQueries({ queryKey: ["fee-payments"] });
  };

  const recordExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description) return toast.error("Missing expense details");
    const { error } = await supabase.from("expenses").insert({
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      description: expenseForm.description,
      recorded_by: Route.useRouteContext().user.id
    });
    if (error) return toast.error(error.message);
    toast.success("Expense recorded");
    setExpenseOpen(false);
    setExpenseForm({ category: "SUPPLIES", amount: "", description: "" });
    qc.invalidateQueries({ queryKey: ["school-expenses"] });
  };

  const recordScholarship = async () => {
    if (!selectedStudent || !scholarshipForm.amount) return toast.error("Please select a student and amount");
    const { error } = await supabase.from("scholarships").insert({
      student_id: selectedStudent,
      amount: Number(scholarshipForm.amount),
      description: scholarshipForm.description
    });
    if (error) return toast.error(error.message);
    toast.success("Scholarship awarded");
    setScholarshipOpen(false); setSelectedStudent(""); setScholarshipForm({ amount: "", description: "" }); setSearch("");
    qc.invalidateQueries({ queryKey: ["student-scholarships"] });
  };

  const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const totalScholarships = scholarships.reduce((acc, s) => acc + Number(s.amount), 0);

  const handleDownloadReceipt = async (p: any) => {
    try {
      const blob = await buildReceipt({
        paymentId: p.id,
        studentName: p.students?.full_name,
        admissionNumber: p.students?.admission_number,
        amount: Number(p.amount),
        date: p.created_at,
        method: p.method || "CASH",
        reference: p.reference || ""
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt_${p.students?.admission_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      toast.error("Receipt error: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Financial Console</h2>
          <p className="text-muted-foreground">Manage revenue, expenditures, and student scholarships.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={scholarshipOpen} onOpenChange={setScholarshipOpen}>
            <DialogTrigger asChild><Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"><Trophy className="h-4 w-4 mr-1.5" /> Award Scholarship</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Award Scholarship</DialogTitle><DialogDescription>Apply a fee waiver or discount for a student.</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Student</Label>
                  <Input placeholder="Type name..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  {students.length > 0 && (
                    <div className="border rounded-md mt-1 divide-y max-h-40 overflow-auto bg-background">
                      {students.map((s) => (
                        <div key={s.id} className="p-2 text-sm cursor-pointer hover:bg-accent" onClick={() => { setSelectedStudent(s.id); setSearch(s.full_name); }}>
                          {s.full_name} ({s.admission_number})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2"><Label>Amount</Label><Input type="number" value={scholarshipForm.amount} onChange={(e) => setScholarshipForm({...scholarshipForm, amount: e.target.value})} /></div>
                <div className="space-y-2"><Label>Reason / Description</Label><Textarea value={scholarshipForm.description} onChange={(e) => setScholarshipForm({...scholarshipForm, description: e.target.value})} placeholder="e.g. Academic Excellence Award" /></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setScholarshipOpen(false)}>Cancel</Button><Button onClick={recordScholarship} className="bg-indigo-600 hover:bg-indigo-700">Apply Scholarship</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
            <DialogTrigger asChild><Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"><TrendingDown className="h-4 w-4 mr-1.5" /> Log Expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Expense</DialogTitle><DialogDescription>Record outgoing funds for school operations.</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                   <Label>Category</Label>
                   <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({...expenseForm, category: v})}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="SALARY">Staff Salary</SelectItem>
                       <SelectItem value="SUPPLIES">School Supplies</SelectItem>
                       <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                       <SelectItem value="UTILITIES">Utilities</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2"><Label>Amount</Label><Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="e.g. Purchase of 50 new textbooks" /></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setExpenseOpen(false)}>Cancel</Button><Button onClick={recordExpense} className="bg-red-600 hover:bg-red-700 text-white">Save Expense</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Record Payment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Fee Payment</DialogTitle><DialogDescription>Record a new fee payment for a student.</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Student</Label>
                  <Input placeholder="Type name..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  {students.length > 0 && (
                    <div className="border rounded-md mt-1 divide-y max-h-40 overflow-auto bg-background">
                      {students.map((s) => (
                        <div key={s.id} className="p-2 text-sm cursor-pointer hover:bg-accent" onClick={() => { setSelectedStudent(s.id); setSearch(s.full_name); }}>
                          {s.full_name} ({s.admission_number})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2"><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setPaymentOpen(false)}>Cancel</Button><Button onClick={recordPayment}>Save Payment</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-50 border-emerald-100">
           <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Wallet className="h-4 w-4" /> Revenue</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-emerald-700">KES {totalRevenue.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
           <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Expenses</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-red-700">KES {totalExpenses.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-indigo-50 border-indigo-100">
           <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Trophy className="h-4 w-4" /> Scholarships</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-indigo-700">KES {totalScholarships.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
           <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2"><CreditCard className="h-4 w-4" /> Net Balance</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-foreground">KES {(totalRevenue - totalExpenses).toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full sm:w-[600px] grid-cols-3 h-11 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="payments" className="rounded-lg font-semibold">Incomes (Fees)</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-lg font-semibold">Outgoings (Expenses)</TabsTrigger>
          <TabsTrigger value="scholarships" className="rounded-lg font-semibold">Scholarships</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payments" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Card className="lg:col-span-1 border-none shadow-sm bg-muted/20">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Fee Structures</CardTitle></CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader><TableRow><TableHead>Stream</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                 <TableBody>
                   {structures.map((s: any) => (
                     <TableRow key={s.id}>
                       <TableCell className="text-sm font-medium">{s.streams?.name}</TableCell>
                       <TableCell className="text-right text-xs">KES {s.amount.toLocaleString()}</TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold">Recent Collections</CardTitle></CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Student</TableHead>
                     <TableHead>Date</TableHead>
                     <TableHead className="text-right">Amount</TableHead>
                     <TableHead className="w-12"></TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {payments.map((p: any) => (
                     <TableRow key={p.id}>
                       <TableCell>
                         <div className="font-medium text-sm">{p.students?.full_name}</div>
                         <div className="text-[10px] text-muted-foreground uppercase">{p.students?.admission_number}</div>
                       </TableCell>
                       <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                       <TableCell className="text-right font-bold text-emerald-600">KES {p.amount.toLocaleString()}</TableCell>
                       <TableCell className="text-right">
                         <Button size="icon" variant="ghost" onClick={() => handleDownloadReceipt(p)}><Download className="h-4 w-4" /></Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold">Expenditure Log</CardTitle></CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Date</TableHead>
                     <TableHead>Category</TableHead>
                     <TableHead>Description</TableHead>
                     <TableHead className="text-right">Amount</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {expenses.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No expenses recorded yet.</TableCell></TableRow>}
                   {expenses.map((e: any) => (
                     <TableRow key={e.id}>
                       <TableCell className="text-sm">{new Date(e.expense_date).toLocaleDateString()}</TableCell>
                       <TableCell><Badge variant="outline" className="text-[10px] uppercase font-bold">{e.category}</Badge></TableCell>
                       <TableCell className="text-sm font-medium">{e.description}</TableCell>
                       <TableCell className="text-right font-bold text-red-600">- KES {e.amount.toLocaleString()}</TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scholarships" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold">Scholarships & Waivers</CardTitle></CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Student</TableHead>
                     <TableHead>Awarded At</TableHead>
                     <TableHead>Description</TableHead>
                     <TableHead className="text-right">Amount</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {scholarships.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No scholarships awarded yet.</TableCell></TableRow>}
                   {scholarships.map((s: any) => (
                     <TableRow key={s.id}>
                       <TableCell>
                         <div className="font-medium text-sm">{s.students?.full_name}</div>
                         <div className="text-[10px] text-muted-foreground uppercase">{s.students?.admission_number}</div>
                       </TableCell>
                       <TableCell className="text-xs text-muted-foreground">{new Date(s.awarded_at).toLocaleDateString()}</TableCell>
                       <TableCell className="text-sm">{s.description || "N/A"}</TableCell>
                       <TableCell className="text-right font-bold text-indigo-600">KES {s.amount.toLocaleString()}</TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
