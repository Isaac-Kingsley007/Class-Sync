import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function StudentAttendance() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      attendanceRecords: {
        include: { subject: true },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!student) {
    return <div className="p-8 text-center text-muted-foreground">Student profile not found.</div>;
  }

  // Group attendance by subject
  const subjectMap = new Map<
    string,
    {
      subject: { id: string; name: string; code: string; credits: number; semester: number };
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
    }
  >();

  for (const record of student.attendanceRecords) {
    const existing = subjectMap.get(record.subjectId);
    if (existing) {
      existing.total++;
      if (record.status === "PRESENT") existing.present++;
      if (record.status === "ABSENT") existing.absent++;
      if (record.status === "LATE") existing.late++;
      if (record.status === "EXCUSED") existing.excused++;
    } else {
      subjectMap.set(record.subjectId, {
        subject: record.subject,
        total: 1,
        present: record.status === "PRESENT" ? 1 : 0,
        absent: record.status === "ABSENT" ? 1 : 0,
        late: record.status === "LATE" ? 1 : 0,
        excused: record.status === "EXCUSED" ? 1 : 0,
      });
    }
  }

  const subjects = Array.from(subjectMap.values());

  // Overall stats
  const totalClasses = subjects.reduce((sum, s) => sum + s.total, 0);
  const totalPresent = subjects.reduce((sum, s) => sum + s.present + s.late, 0);
  const totalAbsent = subjects.reduce((sum, s) => sum + s.absent, 0);
  const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

  function getPercentageColor(pct: number) {
    if (pct >= 75) return "text-emerald-600 dark:text-emerald-400";
    if (pct >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  }

  function getProgressColor(pct: number) {
    if (pct >= 75) return "[&>div]:bg-emerald-500";
    if (pct >= 60) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-rose-500";
  }

  function getBadgeVariant(pct: number) {
    if (pct >= 75) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
    if (pct >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400";
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your attendance records across all enrolled subjects.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getPercentageColor(overallPercentage)}`}>
              {overallPercentage}%
            </div>
            <Progress value={overallPercentage} className={`mt-2 h-2 ${getProgressColor(overallPercentage)}`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Classes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalClasses}</div>
            <p className="mt-1 text-xs text-muted-foreground">Across {subjects.length} subjects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Classes Attended</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{totalPresent}</div>
            <p className="mt-1 text-xs text-muted-foreground">Present + Late</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Classes Missed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{totalAbsent}</div>
            <p className="mt-1 text-xs text-muted-foreground">Absent only</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Breakdown</CardTitle>
          <CardDescription>Detailed attendance per subject this semester</CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No attendance records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Excused</TableHead>
                    <TableHead className="w-[180px]">Percentage</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((s) => {
                    const pct = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
                    return (
                      <TableRow key={s.subject.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{s.subject.name}</p>
                            <p className="text-xs text-muted-foreground">{s.subject.code} · {s.subject.credits} credits</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{s.total}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-medium">{s.present}</TableCell>
                        <TableCell className="text-center text-rose-600 font-medium">{s.absent}</TableCell>
                        <TableCell className="text-center text-amber-600 font-medium">{s.late}</TableCell>
                        <TableCell className="text-center text-sky-600 font-medium">{s.excused}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className={`h-2 flex-1 ${getProgressColor(pct)}`} />
                            <span className={`text-sm font-bold min-w-[3ch] text-right ${getPercentageColor(pct)}`}>{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getBadgeVariant(pct)} variant="secondary">
                            {pct >= 75 ? "Good" : pct >= 60 ? "Warning" : "Critical"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span>≥ 75% — Good Standing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span>60–74% — Warning</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <span>&lt; 60% — Critical</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
