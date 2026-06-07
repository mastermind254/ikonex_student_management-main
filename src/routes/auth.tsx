import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ikonex Academy — Secure Access" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const determineRedirect = (role: string) => {
    if (role === "ADMIN") return "/dashboard";
    if (role === "BURSAR") return "/fees";
    if (role === "TEACHER") return "/my-classes";
    return "/dashboard";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ 
      email: email.trim().toLowerCase(), 
      password 
    });
    
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    const { data: auth } = await supabase.from("authorized_staff").select("role, full_name").eq("email", email.trim().toLowerCase()).maybeSingle();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).maybeSingle();
    
    let finalRole = profile?.role || "TEACHER";

    if (auth && user && auth.role !== profile?.role) {
      await supabase.from("profiles").upsert({
        id: user.id,
        role: auth.role,
        full_name: auth.full_name || profile?.full_name || email.split("@")[0]
      });
      finalRole = auth.role;
    }

    setLoading(false);
    navigate({ to: determineRedirect(finalRole), replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user }, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    if (user) {
      const { data: auth } = await supabase.from("authorized_staff").select("*").eq("email", email.trim().toLowerCase()).maybeSingle();
      const role = auth?.role || "TEACHER";
      const full_name = auth?.full_name || email.split("@")[0];
      await supabase.from("profiles").upsert({ id: user.id, role, full_name });
      if (role === "TEACHER") {
        await supabase.from("teachers").upsert({ profile_id: user.id, full_name, email: email.trim().toLowerCase() }, { onConflict: 'email' });
      }
      setLoading(false);
      toast.success("Identity established");
      navigate({ to: determineRedirect(role), replace: true });
    } else {
      setLoading(false);
      toast.info("Verify your email");
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background items-stretch overflow-hidden">
      {/* High-Contrast Visual Panel */}
      <div className="relative hidden lg:block lg:w-1/2 xl:w-[60%]">
        <div className="absolute inset-0 bg-slate-900">
          <img 
            src="https://images.unsplash.com/photo-1778159265191-855bcf1ce7b2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwyOXx8fGVufDB8fHx8fA%3D%3D" 
            alt="Academy Building" 
            className="w-full h-full object-cover opacity-60 contrast-125 brightness-90 grayscale-[10%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>
        
        <div className="relative h-full flex flex-col justify-between p-16 z-10">
          <div className="flex items-center gap-4">
             <img src="/icons/icons8-school-100.png" alt="Ikonex" className="h-20 w-20 brightness-0 invert shadow-2xl" />
             <div className="h-10 w-[2px] bg-white/20" />
             <span className="text-white/80 font-black uppercase tracking-[0.3em] text-sm">Ikonex Academy</span>
          </div>
          <div className="space-y-4">
             <h1 className="text-8xl font-black tracking-tighter text-white leading-[0.9]">Excellence.</h1>
             <p className="text-indigo-300 font-bold uppercase tracking-[0.5em] text-xs">Administrative Ecosystem &bull; 2026</p>
          </div>
        </div>
      </div>

      {/* Auth Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-background/95 backdrop-blur-xl">
        <div className="w-full max-w-[420px] space-y-12">
          {/* Central Branding */}
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
               <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
               <img src="/icons/icons8-school-100.png" alt="Ikonex Logo" className="relative h-32 w-32 drop-shadow-2xl" />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tighter text-foreground">Ikonex Academy</h2>
              <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px]">Excellence starts here</p>
            </div>
          </div>

          <div className="bg-white dark:bg-card p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-white/50">
            <Tabs defaultValue="login" className="w-full space-y-8">
              <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-slate-100 dark:bg-muted/50 rounded-2xl">
                <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-0 animate-in fade-in zoom-in-95 duration-500">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input 
                        type="email" 
                        required 
                        className="h-14 pl-11 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all text-base font-bold placeholder:text-slate-400"
                        placeholder="Work Email"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                      />
                    </div>
                    
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input 
                        type="password" 
                        required 
                        className="h-14 pl-11 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all text-base font-bold placeholder:text-slate-400"
                        placeholder="Security Token"
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-14 rounded-2xl text-base font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                    {loading ? "Authorizing..." : "Enter Portal"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0 animate-in fade-in zoom-in-95 duration-500">
                <form onSubmit={handleSignup} className="space-y-6">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                    <p className="text-[10px] font-bold text-indigo-800 leading-tight">Official academy email required. Registration subject to administrative authorization.</p>
                  </div>
                  <div className="space-y-4">
                    <Input 
                      type="email" 
                      required 
                      className="h-14 px-5 rounded-2xl border-slate-200 bg-slate-50 text-base font-bold"
                      placeholder="Registry Email"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                    <Input 
                      type="password" 
                      required 
                      minLength={6} 
                      className="h-14 px-5 rounded-2xl border-slate-200 bg-slate-50 text-base font-bold"
                      placeholder="Create Password"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                    />
                  </div>
                  <Button type="submit" className="w-full h-14 rounded-2xl text-base font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 transition-all" disabled={loading}>
                    {loading ? "Processing..." : "Establish Identity"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
