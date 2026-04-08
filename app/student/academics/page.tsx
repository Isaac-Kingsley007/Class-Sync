import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const gradeLabels: Record<string, string> = {
  A_PLUS: "A+",
  A: "A",
  B_PLUS: "B+",
  B: "B",
  C_PLUS: "C+",
  C: "C",
  D: "D",
  F: "F",
};

const gradeColors: Record<string, string> = {
  A_PLUS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  A: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  B_PLUS: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  B: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  C_PLUS: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  C: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  D: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  F: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
};

const gradePoints: Record<string, number> = {
  A_PLUS: 10, A: 9, B_PLUS: 8, B: 7, C_PLUS: 6, C: 5, D: 4, F: 0,
};

export default async function StudentAcademics() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      academicRecords: {
        include: {
          subject: true,
          faculty: { include: { user: true } },
        },
        orderBy: [{ subjectId: "asc" }, { examType: "asc" }],
      },
    },
  });

  if (!student) {
    return <div className="p-8 text-center text-muted-foreground">Student profile not found.</div>;
  }

  // Group by subject
  const subjectMap = new Map<
    string,
    {
      subject: { id: string; name: string; code: string; credits: number; semester: number };
      records: Array<{
        id: string;
        examType: string | null;
        marksObtained: number;
        totalMarks: number;
        grade: string | null;
        facultyName: string;
        academicYear: string;
      }>;
    }
  >();

  for (const record of student.academicRecords) {
    const existing = subjectMap.get(record.subjectId);
    const entry = {
      id: record.id,
      examType: record.examType,
      marksObtained: record.marksObtained,
      totalMarks: record.totalMarks,
      grade: record.grade,
      facultyName: record.faculty.user.name,
      academicYear: record.academicYear,
    };
    if (existing) {
      existing.records.push(entry);
    } else {
      subjectMap.set(record.subjectId, {
        subject: record.subject,
        records: [entry],
      });
    }
  }

  const subjects = Array.from(subjectMap.values());

  // Semester summary stats
  const totalCredits = subjects.reduce((sum, s) => sum + s.subject.credits, 0);

  // Calculate GPA from final exams (or midterm if no final)
  let totalGradePoints = 0;
  let totalGpaCredits = 0;
  for (const s of subjects) {
    const finalRecord = s.records.find((r) => r.examType === "Final") || s.records.find((r) => r.examType === "Midterm");
    if (finalRecord?.grade) {
      const gp = gradePoints[finalRecord.grade] ?? 0;
      totalGradePoints += gp * s.subject.credits;
      totalGpaCredits += s.subject.credits;
    }
  }
  const gpa = totalGpaCredits > 0 ? (totalGradePoints / totalGpaCredits) : 0;

  // Grade distribution count
  const gradeCounts: Record<string, number> = {};
  for (const s of subjects) {
    for (const r of s.records) {
      if (r.grade) {
        gradeCounts[r.grade] = (gradeCounts[r.grade] || 0) + 1;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Academics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your marks, grades, and academic performance across all subjects.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Semester GPA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{gpa.toFixed(2)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Scale of 10</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{subjects.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Semester {student.semester}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCredits}</div>
            <p className="mt-1 text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Exams Taken</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{student.academicRecords.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">All exam types</p>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Distribution</CardTitle>
          <CardDescription>Across all exams and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(gradeLabels).map(([key, label]) => {
              const count = gradeCounts[key] || 0;
              if (count === 0) return null;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 ${gradeColors[key]}`}
                >
                  <span className="text-2xl font-bold">{label}</span>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold leading-none">{count}</span>
                    <span className="text-[10px] opacity-80">{count === 1 ? "exam" : "exams"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Subject-wise Records */}
      {subjects.map((s) => {
        // Calculate overall for this subject
        const totalObtained = s.records.reduce((sum, r) => sum + r.marksObtained, 0);
        const totalMax = s.records.reduce((sum, r) => sum + r.totalMarks, 0);
        const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

        return (
          <Card key={s.subject.id}>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{s.subject.name}</CardTitle>
                  <CardDescription>{s.subject.code} · {s.subject.credits} Credits · Semester {s.subject.semester}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Overall:</span>
                  <Badge
                    variant="secondary"
                    className={`text-sm font-bold ${
                      overallPct >= 80
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : overallPct >= 50
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
                    }`}
                  >
                    {overallPct}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Type</TableHead>
                    <TableHead className="text-center">Marks Obtained</TableHead>
                    <TableHead className="text-center">Total Marks</TableHead>
                    <TableHead className="text-center">Percentage</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead>Faculty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.records.map((r) => {
                    const pct = r.totalMarks > 0 ? Math.round((r.marksObtained / r.totalMarks) * 100) : 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.examType || "—"}</TableCell>
                        <TableCell className="text-center font-semibold">{r.marksObtained}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{r.totalMarks}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-semibold ${
                              pct >= 80
                                ? "text-emerald-600"
                                : pct >= 50
                                ? "text-amber-600"
                                : "text-rose-600"
                            }`}
                          >
                            {pct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {r.grade ? (
                            <Badge className={gradeColors[r.grade]} variant="secondary">
                              {gradeLabels[r.grade]}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.facultyName}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Separator className="my-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{totalObtained}</span> / {totalMax}
                </span>
                <span className="text-muted-foreground">
                  Academic Year: <span className="font-semibold text-foreground">{s.records[0]?.academicYear}</span>
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {subjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No academic records found for this semester.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
