import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;
  const role = cookieStore.get("session_user_role")?.value;

  if (!userId || role !== "faculty") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const faculty = await prisma.faculty.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!faculty) {
    return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const subjectId = searchParams.get("subjectId");
  const period = searchParams.get("period") ?? "daily"; // daily | weekly | monthly
  const refDate = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  // ── Compute date range ──────────────────────────────────────────────────────
  const ref = new Date(refDate);
  ref.setUTCHours(0, 0, 0, 0);

  let from: Date;
  let to: Date;
  let periodLabel: string;

  if (period === "daily") {
    from = new Date(ref);
    to = new Date(ref);
    to.setUTCHours(23, 59, 59, 999);
    periodLabel = ref.toISOString().split("T")[0];
  } else if (period === "weekly") {
    // Monday of the week containing refDate
    const day = ref.getUTCDay(); // 0=Sun
    const diffToMon = (day === 0 ? -6 : 1 - day);
    from = new Date(ref);
    from.setUTCDate(ref.getUTCDate() + diffToMon);
    from.setUTCHours(0, 0, 0, 0);
    to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 6);
    to.setUTCHours(23, 59, 59, 999);
    periodLabel = `Week_${from.toISOString().split("T")[0]}_to_${to.toISOString().split("T")[0]}`;
  } else {
    // monthly — full calendar month of refDate
    from = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
    to = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const monthStr = ref.toLocaleString("default", { month: "long", year: "numeric" });
    periodLabel = monthStr.replace(" ", "_");
  }

  // ── Fetch subject info ──────────────────────────────────────────────────────
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { department: true },
  });

  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  // ── Fetch attendance records in range ──────────────────────────────────────
  const records = await prisma.attendance.findMany({
    where: {
      facultyId: faculty.id,
      subjectId,
      date: { gte: from, lte: to },
    },
    include: {
      student: { include: { user: true } },
    },
    orderBy: [{ date: "asc" }, { student: { rollNumber: "asc" } }],
  });

  if (records.length === 0) {
    return NextResponse.json(
      { error: "No attendance records found for the selected period." },
      { status: 404 }
    );
  }

  // ── Build workbook ──────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  // Sheet 1: Raw records
  const rawRows = records.map((r, i) => ({
    "#": i + 1,
    "Date": r.date.toISOString().split("T")[0],
    "Roll Number": r.student.rollNumber,
    "Student Name": r.student.user.name,
    "Status": r.status,
    "Remarks": r.remarks ?? "",
  }));

  const rawSheet = XLSX.utils.json_to_sheet(rawRows);
  rawSheet["!cols"] = [
    { wch: 4 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 10 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, rawSheet, "Attendance Records");

  // Sheet 2: Summary per student
  const studentMap = new Map<
    string,
    { rollNumber: string; name: string; present: number; absent: number; late: number; excused: number; total: number }
  >();

  for (const r of records) {
    const sid = r.studentId;
    if (!studentMap.has(sid)) {
      studentMap.set(sid, {
        rollNumber: r.student.rollNumber,
        name: r.student.user.name,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      });
    }
    const entry = studentMap.get(sid)!;
    entry.total++;
    if (r.status === "PRESENT") entry.present++;
    else if (r.status === "ABSENT") entry.absent++;
    else if (r.status === "LATE") entry.late++;
    else if (r.status === "EXCUSED") entry.excused++;
  }

  const summaryRows = Array.from(studentMap.values()).map((s) => ({
    "Roll Number": s.rollNumber,
    "Student Name": s.name,
    "Total Classes": s.total,
    "Present": s.present,
    "Absent": s.absent,
    "Late": s.late,
    "Excused": s.excused,
    "Attendance %": s.total > 0 ? `${Math.round(((s.present + s.late) / s.total) * 100)}%` : "N/A",
  }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = [
    { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Sheet 3: Meta info
  const metaSheet = XLSX.utils.aoa_to_sheet([
    ["Field", "Value"],
    ["Subject", subject.name],
    ["Subject Code", subject.code],
    ["Department", subject.department.name],
    ["Semester", subject.semester],
    ["Period", period.charAt(0).toUpperCase() + period.slice(1)],
    ["From", from.toISOString().split("T")[0]],
    ["To", to.toISOString().split("T")[0]],
    ["Total Records", records.length],
    ["Generated At", new Date().toISOString()],
  ]);
  metaSheet["!cols"] = [{ wch: 18 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, metaSheet, "Info");

  // ── Stream as .xlsx ─────────────────────────────────────────────────────────
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const fileName = `Attendance_${subject.code}_${periodLabel}.xlsx`
    .replace(/[^\w._-]/g, "_");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
