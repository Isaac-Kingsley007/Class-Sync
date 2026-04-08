import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { MarksUploader } from "./marks-uploader";

export default async function FacultyMarksPage() {
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

  // For each subject, get students of same department + semester
  const studentsBySubject: Record<string, { id: string; name: string; rollNumber: string }[]> = {};

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
    }));
  }

  // Get existing academic records for all subjects
  const existingRecords = await prisma.academicRecord.findMany({
    where: {
      facultyId: faculty.id,
      subjectId: { in: faculty.subjects.map((s) => s.id) },
    },
    select: {
      studentId: true,
      subjectId: true,
      examType: true,
      marksObtained: true,
      totalMarks: true,
    },
  });

  // Build lookup: subjectId_examType -> records[]
  const existingBySubjectExam: Record<string, { studentId: string; marksObtained: number; totalMarks: number }[]> = {};
  for (const record of existingRecords) {
    const key = `${record.subjectId}_${record.examType || "Unknown"}`;
    if (!existingBySubjectExam[key]) {
      existingBySubjectExam[key] = [];
    }
    existingBySubjectExam[key].push({
      studentId: record.studentId,
      marksObtained: record.marksObtained,
      totalMarks: record.totalMarks,
    });
  }

  const subjects = faculty.subjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    semester: s.semester,
    credits: s.credits,
    departmentCode: s.department.code,
  }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upload Marks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter or update student marks for your subjects. Grades are auto-calculated.
        </p>
      </div>

      <MarksUploader
        subjects={subjects}
        studentsBySubject={studentsBySubject}
        existingBySubjectExam={existingBySubjectExam}
      />
    </div>
  );
}
