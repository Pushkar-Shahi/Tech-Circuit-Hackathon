import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Brain,
  FileCheck2,
  Inbox,
  LayoutDashboard,
  LineChart,
  Moon,
  Palette,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUiStore } from "@/lib/store";
import { ROLES, type Role } from "@/lib/permissions";
import { toast } from "sonner";

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const set = useUiStore((s) => s.set);
  const theme = useUiStore((s) => s.theme);
  const currentRole = useUiStore((s) => s.role);
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const close = () => set({ commandOpen: false });
  const go = (to: string) => {
    close();
    navigate(to);
  };

  const handleRoleSwitch = (role: Role, label: string) => {
    set({ role });
    close();
    toast.info(`Switched active role to: ${label}`);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    set({ theme: next });
    close();
    toast.info(`Theme set to ${next}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => set({ commandOpen: o })}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0" hideClose aria-describedby={undefined}>
        <VisuallyHidden.Root>
          <DialogTitle>Command palette</DialogTitle>
        </VisuallyHidden.Root>
        <Command loop>
          <CommandInput
            value={q}
            onValueChange={setQ}
            placeholder="Type a command, navigate, or switch role…"
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => go("/campaigns/new")}>
                <Plus className="mr-2 h-4 w-4 text-sys" />
                <span>Create New Campaign & Audit</span>
              </CommandItem>
              <CommandItem onSelect={() => go("/brain")}>
                <Brain className="mr-2 h-4 w-4 text-purple-500" />
                <span>Ingest Brand Guidelines / Fact Sheet</span>
              </CommandItem>
              <CommandItem onSelect={toggleTheme}>
                {theme === "dark" ? (
                  <Sun className="mr-2 h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="mr-2 h-4 w-4 text-sys" />
                )}
                <span>Toggle Theme ({theme === "dark" ? "Light" : "Dark"})</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Navigation */}
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => go("/")}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Executive Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => go("/campaigns")}>
                <FileCheck2 className="mr-2 h-4 w-4" />
                <span>Campaigns & Creative Audits</span>
              </CommandItem>
              <CommandItem onSelect={() => go("/queue")}>
                <Inbox className="mr-2 h-4 w-4" />
                <span>Manager Review Queue</span>
              </CommandItem>
              <CommandItem onSelect={() => go("/brain")}>
                <Brain className="mr-2 h-4 w-4" />
                <span>Brand Brain Knowledge Stores</span>
              </CommandItem>
              <CommandItem onSelect={() => go("/brands")}>
                <Palette className="mr-2 h-4 w-4" />
                <span>Brand Identities & Rubrics</span>
              </CommandItem>
              <CommandItem onSelect={() => go("/analytics")}>
                <LineChart className="mr-2 h-4 w-4" />
                <span>Governance Analytics & Drift</span>
              </CommandItem>
              <CommandItem onSelect={() => go("/audit")}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Cryptographic Audit Trail</span>
              </CommandItem>
              <CommandItem onSelect={() => go("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Platform Settings & Scoring Policy</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Switch Active Demo Role */}
            <CommandGroup heading="Switch Role (Demo Mode)">
              {ROLES.map((r) => (
                <CommandItem
                  key={r.id}
                  onSelect={() => handleRoleSwitch(r.id, r.label)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{r.label}</span>
                    <span className="ml-2 text-2xs text-muted-foreground">({r.user})</span>
                  </div>
                  {currentRole === r.id && (
                    <span className="text-2xs font-semibold text-sys uppercase">Active</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
