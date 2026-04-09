import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

export default async function StudentDashboard() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: true,
      department: true,
      attendanceRecords: {
        include: { subject: true },
        orderBy: { date: "desc" },
      },
      academicRecords: {
        include: { subject: true },
      },
    },
  });

  if (!student) {
    return <div className="p-8 text-center text-muted-foreground">Student profile not found.</div>;
  }

  // Calculate overall attendance
  const totalClasses = student.attendanceRecords.length;
  const presentClasses = student.attendanceRecords.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE"
  ).length;
  const overallAttendance = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

  // Get unique subjects
  const subjectIds = [...new Set(student.attendanceRecords.map((r) => r.subjectId))];
  const totalSubjects = subjectIds.length;

  // Calculate total credits from academic records
  const uniqueSubjectCredits = new Map<string, number>();
  student.academicRecords.forEach((r) => {
    if (!uniqueSubjectCredits.has(r.subjectId)) {
      uniqueSubjectCredits.set(r.subjectId, r.credits);
    }
  });
  const totalCredits = Array.from(uniqueSubjectCredits.values()).reduce((a, b) => a + b, 0);

  // Calculate GPA-style from grades
  const gradePoints: Record<string, number> = {
    A_PLUS: 10, A: 9, B_PLUS: 8, B: 7, C_PLUS: 6, C: 5, D: 4, F: 0,
  };
  // Use Final exam grades, falling back to Midterm for GPA
  const finalRecords = student.academicRecords.filter((r) => r.examType === "Final");
  const gpaRecords = finalRecords.length > 0 ? finalRecords : student.academicRecords.filter((r) => r.examType === "Midterm");

  let gpa = 0;
  if (gpaRecords.length > 0) {
    const totalWeighted = gpaRecords.reduce((acc, r) => {
      const gp = r.grade ? gradePoints[r.grade] ?? 0 : 0;
      return acc + gp * r.credits;
    }, 0);
    const totalCreds = gpaRecords.reduce((acc, r) => acc + r.credits, 0);
    gpa = totalCreds > 0 ? Math.round((totalWeighted / totalCreds) * 100) / 100 : 0;
  }

  // Recent 5 attendance
  const recentAttendance = student.attendanceRecords.slice(0, 5);

  const initials = student.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const statusColors: Record<string, string> = {
    PRESENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    ABSENT: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
    LATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    EXCUSED: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  };

  const attendanceColor =
    overallAttendance >= 75 ? "text-emerald-600" : overallAttendance >= 60 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back! Here&apos;s an overview of your academic profile.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-indigo-600 to-violet-600" />
        <CardContent className="-mt-12 pb-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{student.user.name}</h2>
              <p className="text-sm text-muted-foreground">{student.user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{student.department.code}</Badge>
                <Badge variant="secondary">Semester {student.semester}</Badge>
                <Badge variant="secondary">Roll: {student.rollNumber}</Badge>
              </div>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Department</p>
              <p className="mt-0.5 text-sm font-semibold">{student.department.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Enrollment Year</p>
              <p className="mt-0.5 text-sm font-semibold">{student.enrollmentYear}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Phone</p>
              <p className="mt-0.5 text-sm font-semibold">{student.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
              <p className="mt-0.5 text-sm font-semibold">
                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs font-medium text-muted-foreground">Address</p>
              <p className="mt-0.5 text-sm font-semibold">{student.address || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${attendanceColor}`}>{overallAttendance}%</div>
            <Progress
              value={overallAttendance}
              className="mt-2 h-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">{presentClasses}/{totalClasses} classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Semester</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{student.semester}</div>
            <p className="mt-1 text-xs text-muted-foreground">Academic Year {student.enrollmentYear}–{student.enrollmentYear + 4}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Subjects Enrolled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSubjects}</div>
            <p className="mt-1 text-xs text-muted-foreground">{totalCredits} total credits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>GPA (Weighted)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{gpa.toFixed(2)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Scale of 10</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>Your latest attendance records across subjects</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records found.</p>
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {record.subject.code.slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{record.subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusColors[record.status]} variant="secondary">
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
