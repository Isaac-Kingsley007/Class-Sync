"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  departmentCode: string;
}

interface Props {
  subjects: Subject[];
}

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Daily (single day)",
  weekly: "Weekly (Mon–Sun of selected date)",
  monthly: "Monthly (full calendar month)",
};

export function AttendanceExportButton({ subjects }: Props) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [period, setPeriod] = useState<Period>("monthly");
  const [refDate, setRefDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleDownload() {
    if (!subjectId) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const params = new URLSearchParams({ subjectId, period, date: refDate });
      const res = await fetch(`/api/faculty/attendance/export?${params.toString()}`);

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error ?? "Failed to generate report.");
        return;
      }

      // Trigger browser download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const nameMatch = disposition.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = nameMatch?.[1] ?? "attendance.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {/* Download icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base">Download Attendance Report</CardTitle>
            <CardDescription className="text-xs">
              Export as Excel (.xlsx) with records &amp; summary sheets
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Subject
            </label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Period
            </label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {period === "daily" ? "Date" : period === "weekly" ? "Any date in week" : "Any date in month"}
            </label>
            <Input
              type="date"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Helper text */}
        <p className="mt-2 text-[11px] text-muted-foreground">
          {PERIOD_LABELS[period]}
        </p>

        {/* Action row */}
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleDownload}
            disabled={loading || !subjectId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Excel
              </>
            )}
          </Button>

          {/* Feedback */}
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
          {success && !error && (
            <p className="text-sm text-emerald-600 font-medium flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Downloaded successfully!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
