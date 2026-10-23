import { Building2, Check, ChevronDown, HelpCircle, Laptop, LogOut, Menu, Moon, Search, Sun, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tip,
} from "@/components/ui/menus";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import { KeyboardHint } from "@/components/shared/misc";
import { useUiStore, type Theme } from "@/lib/store";
import { ROLES, type Role } from "@/lib/permissions";
import { cn, isMac } from "@/lib/utils";
import { toast } from "sonner";

const ORGS = [
  { id: "org_acme", name: "Acme Cloud Technologies Inc.", brands: "Acme Cloud Enterprise · Acme AI Labs" },
  { id: "org_subsidiary", name: "Apex Global Media", brands: "Apex Digital" },
];

export function Topbar() {
  const set = useUiStore((s) => s.set);
  const theme = useUiStore((s) => s.theme);
  const role = useUiStore((s) => s.role);
  const orgId = useUiStore((s) => s.orgId);
  const org = ORGS.find((o) => o.id === orgId) ?? ORGS[0];

  const currentRoleObj = ROLES.find((r) => r.id === role) ?? ROLES[1];

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.system.health(),
    refetchInterval: 30000,
  });
  const aiConfigured = health?.aiConfigured ?? false;

  const nextTheme: Record<Theme, Theme> = { dark: "light", light: "system", system: "dark" };
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Laptop;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={() => set({ mobileNavOpen: true })}>
        <Menu />
      </Button>

      <button
        type="button"
        onClick={() => set({ commandOpen: true })}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-surface px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:border-muted-foreground/40 md:max-w-md"
        aria-label="Search campaigns, rules, verified facts"
        aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">Search campaigns, rules, verified facts…</span>
        <KeyboardHint keys={[isMac ? "⌘" : "Ctrl", "K"]} className="ml-auto hidden sm:inline-flex" />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Dual-Mode AI Engine Status Badge */}
        <Tip
          content={
            aiConfigured
              ? "Gemini 2.5 Active: Multimodal LLM & tone scoring online with automatic fallback resilience."
              : "Offline Rubric Mode: Deterministic rubric explanations and zero-network local fallback active."
          }
        >
          <button
            type="button"
            onClick={() => {
              toast.info(
                aiConfigured ? "✦ Dual-Mode AI: Gemini Active" : "✦ Dual-Mode AI: Offline Rubric Mode",
                {
                  description: aiConfigured
                    ? "Gemini 2.5 Flash is actively generating contextual rewrites with full fallback protection."
                    : "Zero external network dependencies required. Deterministic rubric explanations guarantee uptime.",
                }
              );
            }}
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm border",
              aiConfigured
                ? "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
                : "bg-slate-500/10 text-slate-400 border-slate-500/30 hover:bg-slate-500/20"
            )}
          >
            <span>✦</span>
            <span>{aiConfigured ? "Gemini 2.5 Active" : "Offline Rubric Mode"}</span>
          </button>
        </Tip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden max-w-[280px] lg:inline-flex" aria-label={`Organization: ${org.name}`}>
              <Building2 className="text-sys" />
              <span className="truncate">{org.name}</span>
              <ChevronDown className="opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Organization</DropdownMenuLabel>
            {ORGS.map((o) => (
              <DropdownMenuItem
                key={o.id}
                onSelect={() => {
                  if (o.id !== org.id) toast.info("Active demo data is seeded for Acme Cloud Technologies", { description: `${o.name} would switch tenant scope.` });
                }}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{o.name}</div>
                  <div className="text-2xs text-muted-foreground">{o.brands}</div>
                </div>
                {o.id === org.id && <Check className="text-sys" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tip content={`Theme: ${theme} (click to switch)`}>
          <Button variant="ghost" size="icon" aria-label={`Theme: ${theme}. Switch to ${nextTheme[theme]}`} onClick={() => set({ theme: nextTheme[theme] })}>
            <ThemeIcon />
          </Button>
        </Tip>

        <Tip content="Keyboard shortcuts (?)">
          <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts" onClick={() => set({ helpOpen: true })}>
            <HelpCircle />
          </Button>
        </Tip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 flex items-center gap-2 rounded-md border border-transparent p-1 pr-2.5 transition-colors hover:border-border hover:bg-surface-2"
              aria-label={`User menu: ${currentRoleObj.user}, ${currentRoleObj.label}`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sys/80 to-ai/80 text-2xs font-bold text-white shadow-sm">
                {currentRoleObj.user.split(" ").map((n) => n[0]).join("")}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-semibold text-foreground">{currentRoleObj.user}</span>
                <span className="block text-[11px] font-medium text-sys">{currentRoleObj.label}</span>
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="normal-case tracking-normal">
              <div className="text-sm font-semibold text-foreground">{currentRoleObj.user}</div>
              <div className="text-xs text-muted-foreground">{currentRoleObj.user.toLowerCase().replace(" ", ".")}@acme.com</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCog className="h-3.5 w-3.5" /> Dev Mode · Switch Governance Role
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={role} onValueChange={(v) => {
              set({ role: v as Role });
              const r = ROLES.find(x => x.id === v);
              toast.success(`Switched role to ${r?.label}`, { description: `Now acting as ${r?.user}` });
            }}>
              {ROLES.map((r) => (
                <DropdownMenuRadioItem key={r.id} value={r.id} onSelect={(e) => e.preventDefault()}>
                  <div>
                    <div className="font-medium">{r.label} ({r.user})</div>
                    <div className="text-2xs text-muted-foreground">{r.description}</div>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => toast.info("VeriBrand AI demo session is permanently active")}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
