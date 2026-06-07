import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search, User, Layers, PlusCircle, ClipboardEdit, FileText, Settings, LayoutDashboard } from "lucide-react";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; type: 'student' | 'stream' }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const fetchResults = async () => {
      const [st, sm] = await Promise.all([
        supabase.from("students").select("id, full_name").ilike("full_name", `%${search}%`).limit(5),
        supabase.from("streams").select("id, name").ilike("name", `%${search}%`).limit(3),
      ]);
      const formatted = [
        ...(st.data?.map(s => ({ id: s.id, name: s.full_name, type: 'student' as const })) || []),
        ...(sm.data?.map(s => ({ id: s.id, name: s.name, type: 'stream' as const })) || []),
      ];
      setResults(formatted);
    };
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const runCommand = (to: string, params?: any) => {
    navigate({ to, params });
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border rounded-md hover:bg-accent transition-colors bg-background group"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 ml-2">
          <span className="text-xs group-hover:text-primary">Ctrl +</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type to search students, streams or actions..." onValueChange={setSearch} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand("/dashboard")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Go to Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("/students")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Register New Student</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("/scores")}>
              <ClipboardEdit className="mr-2 h-4 w-4" />
              <span>Enter Academic Scores</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("/reports")}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Generate PDF Reports</span>
            </CommandItem>
          </CommandGroup>

          {results.length > 0 && <CommandSeparator />}

          <CommandGroup heading="Students">
            {results.filter(r => r.type === 'student').map((r) => (
              <CommandItem
                key={r.id}
                onSelect={() => runCommand("/students/$studentId", { studentId: r.id })}
              >
                <User className="mr-2 h-4 w-4" />
                <span>{r.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Streams">
            {results.filter(r => r.type === 'stream').map((r) => (
              <CommandItem
                key={r.id}
                onSelect={() => runCommand("/streams")}
              >
                <Layers className="mr-2 h-4 w-4" />
                <span>{r.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => runCommand("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>System Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
