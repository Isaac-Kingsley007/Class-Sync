import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default async function FacultyDashboard() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  const faculty = await prisma.faculty.findUnique({
    where: { userId },
    include: {
      user: true,
      department: true,
      subjects: {
        include: {
          department: true,
          _count: {
            select: { attendanceRecords: true, academicRecords: true },
          },
        },
      },
    },
  });

  if (!faculty) {
    return <div className="p-8 text-center text-muted-foreground">Faculty profile not found.</div>;
  }

  // Count students in advisory (same department)
  const advisoryStudentCount = await prisma.student.count({
    where: { departmentId: faculty.departmentId },
  });

  // Count unique students across all subjects
  const uniqueStudentIds = new Set<string>();
  for (const subject of faculty.subjects) {
    const records = await prisma.attendance.findMany({
      where: { subjectId: subject.id },
      select: { studentId: true },
      distinct: ["studentId"],
    });
    records.forEach((r) => uniqueStudentIds.add(r.studentId));
  }

  const initials = faculty.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back! Here&apos;s your faculty overview.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-emerald-600 to-teal-600" />
        <CardContent className="-mt-12 pb-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{faculty.user.name}</h2>
              <p className="text-sm text-muted-foreground">{faculty.user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{faculty.department.code}</Badge>
                {faculty.designation && <Badge variant="secondary">{faculty.designation}</Badge>}
                <Badge variant="secondary">ID: {faculty.employeeId}</Badge>
              </div>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Department</p>
              <p className="mt-0.5 text-sm font-semibold">{faculty.department.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Phone</p>
              <p className="mt-0.5 text-sm font-semibold">{faculty.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Date of Joining</p>
              <p className="mt-0.5 text-sm font-semibold">
                {faculty.dateOfJoining
                  ? new Date(faculty.dateOfJoining).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Employee ID</p>
              <p className="mt-0.5 text-sm font-semibold">{faculty.employeeId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Subjects Handling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{faculty.subjects.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Across all semesters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{uniqueStudentIds.size}</div>
            <p className="mt-1 text-xs text-muted-foreground">Across your subjects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Advisory Class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{advisoryStudentCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">{faculty.department.code} students</p>
          </CardContent>
        </Card>
      </div>

      {/* Subjects List */}
      <Card>
        <CardHeader>
          <CardTitle>My Subjects</CardTitle>
          <CardDescription>All subjects you are currently handling</CardDescription>
        </CardHeader>
        <CardContent>
          {faculty.subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No subjects assigned yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {faculty.subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs font-bold">
                    {subject.code.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">{subject.code}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        Sem {subject.semester}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {subject.credits} Credits
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {subject.department.code}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
