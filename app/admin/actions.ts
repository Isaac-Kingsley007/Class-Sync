"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

// ─── Department Actions ──────────────────────────────────────────────────────

export async function createDepartment(formData: FormData) {
  const name = formData.get("name")?.toString();
  const code = formData.get("code")?.toString();
  const description = formData.get("description")?.toString() || null;

  if (!name || !code) return { error: "Name and code are required" };

  try {
    await prisma.department.create({
      data: { name, code, description },
    });
  } catch {
    return { error: "Failed to create department. Code or name may already exist." };
  }

  revalidatePath("/admin/departments");
  return { success: true };
}

export async function updateDepartment(formData: FormData) {
  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString();
  const code = formData.get("code")?.toString();
  const description = formData.get("description")?.toString() || null;

  if (!id || !name || !code) return { error: "Missing required fields" };

  try {
    await prisma.department.update({
      where: { id },
      data: { name, code, description },
    });
  } catch {
    return { error: "Failed to update department." };
  }

  revalidatePath("/admin/departments");
  return { success: true };
}

export async function deleteDepartment(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing ID" };

  try {
    await prisma.department.delete({ where: { id } });
  } catch {
    return { error: "Cannot delete department with existing students/faculty/subjects." };
  }

  revalidatePath("/admin/departments");
  return { success: true };
}

// ─── Subject Actions ─────────────────────────────────────────────────────────

export async function createSubject(formData: FormData) {
  const name = formData.get("name")?.toString();
  const code = formData.get("code")?.toString();
  const credits = parseInt(formData.get("credits")?.toString() || "3");
  const semester = parseInt(formData.get("semester")?.toString() || "1");
  const departmentId = formData.get("departmentId")?.toString();
  const rawFacultyId = formData.get("facultyId")?.toString();
  const facultyId = rawFacultyId && rawFacultyId !== "_none" ? rawFacultyId : null;
  const description = formData.get("description")?.toString() || null;

  if (!name || !code || !departmentId) return { error: "Name, code, and department are required" };

  try {
    await prisma.subject.create({
      data: { name, code, credits, semester, departmentId, facultyId, description },
    });
  } catch {
    return { error: "Failed to create subject. Code may already exist." };
  }

  revalidatePath("/admin/subjects");
  return { success: true };
}

export async function updateSubject(formData: FormData) {
  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString();
  const code = formData.get("code")?.toString();
  const credits = parseInt(formData.get("credits")?.toString() || "3");
  const semester = parseInt(formData.get("semester")?.toString() || "1");
  const departmentId = formData.get("departmentId")?.toString();
  const rawFacultyId = formData.get("facultyId")?.toString();
  const facultyId = rawFacultyId && rawFacultyId !== "_none" ? rawFacultyId : null;
  const description = formData.get("description")?.toString() || null;

  if (!id || !name || !code || !departmentId) return { error: "Missing required fields" };

  try {
    await prisma.subject.update({
      where: { id },
      data: { name, code, credits, semester, departmentId, facultyId, description },
    });
  } catch {
    return { error: "Failed to update subject." };
  }

  revalidatePath("/admin/subjects");
  return { success: true };
}

export async function deleteSubject(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing ID" };

  try {
    await prisma.subject.delete({ where: { id } });
  } catch {
    return { error: "Cannot delete subject with existing attendance/academic records." };
  }

  revalidatePath("/admin/subjects");
  return { success: true };
}

// ─── Student Actions ─────────────────────────────────────────────────────────

export async function createStudent(formData: FormData) {
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString() || "password123";
  const rollNumber = formData.get("rollNumber")?.toString();
  const departmentId = formData.get("departmentId")?.toString();
  const semester = parseInt(formData.get("semester")?.toString() || "1");
  const enrollmentYear = parseInt(formData.get("enrollmentYear")?.toString() || new Date().getFullYear().toString());
  const phone = formData.get("phone")?.toString() || null;
  const address = formData.get("address")?.toString() || null;
  const dob = formData.get("dateOfBirth")?.toString();
  const dateOfBirth = dob ? new Date(dob) : null;

  if (!name || !email || !rollNumber || !departmentId) {
    return { error: "Name, email, roll number, and department are required" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "STUDENT",
        student: {
          create: {
            rollNumber,
            departmentId,
            semester,
            enrollmentYear,
            phone,
            address,
            dateOfBirth,
          },
        },
      },
    });
  } catch {
    return { error: "Failed to create student. Email or roll number may already exist." };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

export async function updateStudent(formData: FormData) {
  const studentId = formData.get("studentId")?.toString();
  const userId = formData.get("userId")?.toString();
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const rollNumber = formData.get("rollNumber")?.toString();
  const departmentId = formData.get("departmentId")?.toString();
  const semester = parseInt(formData.get("semester")?.toString() || "1");
  const enrollmentYear = parseInt(formData.get("enrollmentYear")?.toString() || "2024");
  const phone = formData.get("phone")?.toString() || null;
  const address = formData.get("address")?.toString() || null;
  const dob = formData.get("dateOfBirth")?.toString();
  const dateOfBirth = dob ? new Date(dob) : null;

  if (!studentId || !userId || !name || !email || !rollNumber || !departmentId) {
    return { error: "Missing required fields" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });
    await prisma.student.update({
      where: { id: studentId },
      data: { rollNumber, departmentId, semester, enrollmentYear, phone, address, dateOfBirth },
    });
  } catch {
    return { error: "Failed to update student." };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

export async function deleteStudent(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  if (!userId) return { error: "Missing ID" };

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return { error: "Failed to delete student." };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

// ─── Faculty Actions ─────────────────────────────────────────────────────────

export async function createFaculty(formData: FormData) {
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString() || "password123";
  const employeeId = formData.get("employeeId")?.toString();
  const departmentId = formData.get("departmentId")?.toString();
  const designation = formData.get("designation")?.toString() || null;
  const phone = formData.get("phone")?.toString() || null;
  const doj = formData.get("dateOfJoining")?.toString();
  const dateOfJoining = doj ? new Date(doj) : null;

  if (!name || !email || !employeeId || !departmentId) {
    return { error: "Name, email, employee ID, and department are required" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "FACULTY",
        faculty: {
          create: {
            employeeId,
            departmentId,
            designation,
            phone,
            dateOfJoining,
          },
        },
      },
    });
  } catch {
    return { error: "Failed to create faculty. Email or employee ID may already exist." };
  }

  revalidatePath("/admin/faculty");
  return { success: true };
}

export async function updateFaculty(formData: FormData) {
  const facultyId = formData.get("facultyId")?.toString();
  const userId = formData.get("userId")?.toString();
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const employeeId = formData.get("employeeId")?.toString();
  const departmentId = formData.get("departmentId")?.toString();
  const designation = formData.get("designation")?.toString() || null;
  const phone = formData.get("phone")?.toString() || null;
  const doj = formData.get("dateOfJoining")?.toString();
  const dateOfJoining = doj ? new Date(doj) : null;

  if (!facultyId || !userId || !name || !email || !employeeId || !departmentId) {
    return { error: "Missing required fields" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });
    await prisma.faculty.update({
      where: { id: facultyId },
      data: { employeeId, departmentId, designation, phone, dateOfJoining },
    });
  } catch {
    return { error: "Failed to update faculty." };
  }

  revalidatePath("/admin/faculty");
  return { success: true };
}

export async function deleteFaculty(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  if (!userId) return { error: "Missing ID" };

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return { error: "Failed to delete faculty." };
  }

  revalidatePath("/admin/faculty");
  return { success: true };
}

// ─── Attendance Actions ──────────────────────────────────────────────────────

export async function updateAttendance(formData: FormData) {
  const id = formData.get("id")?.toString();
  const status = formData.get("status")?.toString() as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  const remarks = formData.get("remarks")?.toString() || null;

  if (!id || !status) return { error: "Missing required fields" };

  try {
    await prisma.attendance.update({
      where: { id },
      data: { status, remarks },
    });
  } catch {
    return { error: "Failed to update attendance." };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

export async function deleteAttendance(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing ID" };

  try {
    await prisma.attendance.delete({ where: { id } });
  } catch {
    return { error: "Failed to delete attendance record." };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

// ─── Academic Record Actions ─────────────────────────────────────────────────

export async function updateAcademicRecord(formData: FormData) {
  const id = formData.get("id")?.toString();
  const marksObtained = parseFloat(formData.get("marksObtained")?.toString() || "0");
  const totalMarks = parseFloat(formData.get("totalMarks")?.toString() || "100");
  const grade = formData.get("grade")?.toString() || null;
  const remarks = formData.get("remarks")?.toString() || null;

  if (!id) return { error: "Missing ID" };

  try {
    await prisma.academicRecord.update({
      where: { id },
      data: {
        marksObtained,
        totalMarks,
        grade: grade as "A_PLUS" | "A" | "B_PLUS" | "B" | "C_PLUS" | "C" | "D" | "F" | null,
        remarks,
      },
    });
  } catch {
    return { error: "Failed to update academic record." };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

export async function deleteAcademicRecord(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing ID" };

  try {
    await prisma.academicRecord.delete({ where: { id } });
  } catch {
    return { error: "Failed to delete academic record." };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

// ─── Navigation helper ──────────────────────────────────────────────────────

export async function navigateTo(path: string) {
  redirect(path);
}
