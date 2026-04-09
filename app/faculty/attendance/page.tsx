import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { AttendanceMarker } from "./attendance-marker";
import { AttendanceExportButton } from "./attendance-export-button";

export default async function FacultyAttendancePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  const faculty = await prisma.faculty.findUnique({
    where: { userId },
    include: {
      subjects: {
        include: { department: true },
        orderBy: { code: "asc" },
      },
    },
  });

  if (!faculty) {
    return <div className="p-8 text-center text-muted-foreground">Faculty profile not found.</div>;
  }

  // For each subject, get the students who have attendance records for this subject
  // OR get all students in the same department + semester
  const studentsBySubject: Record<string, { id: string; name: string; rollNumber: string; semester: number }[]> = {};

  for (const subject of faculty.subjects) {
    const students = await prisma.student.findMany({
      where: {
        departmentId: subject.departmentId,
        semester: subject.semester,
      },
      include: { user: true },
      orderBy: { rollNumber: "asc" },
    });

    studentsBySubject[subject.id] = students.map((s) => ({
      id: s.id,
      name: s.user.name,
      rollNumber: s.rollNumber,
      semester: s.semester,
    }));
  }

  // Get today's existing attendance for all faculty subjects
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Get recent 7 days of attendance for pre-loading
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const existingAttendance = await prisma.attendance.findMany({
    where: {
      facultyId: faculty.id,
      subjectId: { in: faculty.subjects.map((s) => s.id) },
      date: { gte: sevenDaysAgo },
    },
    select: {
      studentId: true,
      subjectId: true,
      date: true,
      status: true,
      remarks: true,
    },
  });

  // Build lookup: subjectId_date -> records[]
  const existingBySubjectDate: Record<string, { studentId: string; status: string; remarks: string | null }[]> = {};
  for (const record of existingAttendance) {
    const dateStr = record.date.toISOString().split("T")[0];
    const key = `${record.subjectId}_${dateStr}`;
    if (!existingBySubjectDate[key]) {
      existingBySubjectDate[key] = [];
    }
    existingBySubjectDate[key].push({
      studentId: record.studentId,
      status: record.status,
      remarks: record.remarks,
    });
  }

  const subjects = faculty.subjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    semester: s.semester,
    departmentCode: s.department.code,
  }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mark Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a subject and date, then mark attendance for each student.
        </p>
      </div>

      {/* Excel Download */}
      <AttendanceExportButton subjects={subjects} />

      <AttendanceMarker
        subjects={subjects}
        studentsBySubject={studentsBySubject}
        existingBySubjectDate={existingBySubjectDate}
      />
    </div>
  );
}
