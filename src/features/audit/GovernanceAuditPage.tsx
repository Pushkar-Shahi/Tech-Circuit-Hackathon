import { useState } from "react";
import {
  CheckCircle2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useAuditVerify, useGovernanceAudit } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function GovernanceAuditPage() {
  const [actionFilter] = useState("");
  const { data: auditEvents, isLoading } = useGovernanceAudit({ action: actionFilter || undefined });
  const { refetch: runVerify, isFetching: verifying } = useAuditVerify();
  const [verifyStatus, setVerifyStatus] = useState<{ valid?: boolean; count?: number; message?: string } | null>(null);

  const handleVerify = async () => {
    const res = await runVerify();
    if (res.data) {
      setVerifyStatus(res.data);
      if (res.data.valid) {
        toast.success("Audit Integrity Confirmed", { description: res.data.message });
      } else {
        toast.error("Integrity Verification Failed", { description: res.data.message });
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Cryptographic Governance Audit Log</h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold">
              <Lock className="h-3 w-3" /> Append-Only · SHA-256
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Tamper-evident record of all rule compilations, audits, rewrites, overrides, and approvals.
          </p>
        </div>

        <Button
          variant="outline"
          disabled={verifying}
          onClick={handleVerify}
          className="border-sys/40 text-sys hover:bg-sys/10"
        >
          <ShieldCheck className={cn("h-4 w-4", verifying && "animate-spin")} />
          Verify Hash Integrity
        </Button>
      </div>

      {/* Verification Status Banner */}
      {verifyStatus && (
        <div
          className={cn(
            "rounded-xl border p-4 flex items-center justify-between shadow-sm",
            verifyStatus.valid
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-400"
          )}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <div className="font-bold text-sm">Cryptographic Verification Passed</div>
              <div className="text-xs text-muted-foreground">{verifyStatus.message}</div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold">{verifyStatus.count} verified links</span>
        </div>
      )}

      {/* Audit Log Table Card */}
      <Card className="border bg-surface shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-surface-2/30 px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Immutable Event Sequence</CardTitle>
            <CardDescription className="text-xs">
              Every entry is cryptographically bound to the hash of the preceding event.
            </CardDescription>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {auditEvents?.length ?? 0} events
          </span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-surface-2/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-3">Seq</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor & Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-6 py-3 font-mono">SHA-256 Digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Loading audit trail...
                  </td>
                </tr>
              ) : auditEvents && auditEvents.length > 0 ? (
                auditEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="px-6 py-3 font-mono text-sys font-bold">#{evt.seq}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(evt.ts).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{evt.actorName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{evt.actorRole}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-surface-2 border px-2 py-0.5 font-mono text-2xs font-semibold text-foreground">
                        {evt.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-muted-foreground">{evt.targetType}</div>
                      <div className="font-mono text-[10px] text-foreground">{evt.targetId}</div>
                    </td>
                    <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground truncate max-w-[180px]">
                      {evt.hash}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
