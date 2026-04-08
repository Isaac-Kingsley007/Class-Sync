"use client";

import { useState } from "react";
import { uploadMarksBulk } from "@/app/faculty/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  credits: number;
  departmentCode: string;
}

interface Student {
  id: string;
  name: string;
  rollNumber: string;
}

interface ExistingMark {
  studentId: string;
  marksObtained: number;
  totalMarks: number;
}

interface Props {
  subjects: Subject[];
  studentsBySubject: Record<string, Student[]>;
  existingBySubjectExam: Record<string, ExistingMark[]>;
}

const examTypes = ["Midterm", "Assignment", "Final"];

const gradeFromPercentage = (pct: number): string => {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  if (pct >= 35) return "D";
  return "F";
};

const gradeColor = (grade: string): string => {
  if (["A+", "A"].includes(grade)) return "bg-emerald-100 text-emerald-700";
  if (["B+", "B"].includes(grade)) return "bg-sky-100 text-sky-700";
  if (["C+", "C"].includes(grade)) return "bg-amber-100 text-amber-700";
  if (grade === "D") return "bg-orange-100 text-orange-700";
  return "bg-rose-100 text-rose-700";
};

export function MarksUploader({ subjects, studentsBySubject, existingBySubjectExam }: Props) {
  const currentYear = new Date().getFullYear();
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || "");
  const [examType, setExamType] = useState("Midterm");
  const [totalMarks, setTotalMarks] = useState(100);
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const students = studentsBySubject[selectedSubject] || [];

  function loadExisting(subjectId: string, exam: string) {
    const key = `${subjectId}_${exam}`;
    const existing = existingBySubjectExam[key] || [];
    const newMarks: Record<string, string> = {};

    // Default empty
    const subStudents = studentsBySubject[subjectId] || [];
    for (const s of subStudents) {
      newMarks[s.id] = "";
    }

    // Override with existing data
    for (const r of existing) {
      newMarks[r.studentId] = r.marksObtained.toString();
      if (r.totalMarks !== totalMarks) {
        setTotalMarks(r.totalMarks);
      }
    }

    setMarks(newMarks);
  }

  function handleSubjectChange(subjectId: string) {
    setSelectedSubject(subjectId);
    setResult(null);
    loadExisting(subjectId, examType);
  }

  function handleExamChange(exam: string) {
    setExamType(exam);
    setResult(null);
    loadExisting(selectedSubject, exam);
  }

  // Initialize on first render
  if (selectedSubject && Object.keys(marks).length === 0 && students.length > 0) {
    loadExisting(selectedSubject, examType);
  }

  async function handleSubmit() {
    // Validate marks
    for (const s of students) {
      const val = parseFloat(marks[s.id] || "");
      if (marks[s.id] && (isNaN(val) || val < 0 || val > totalMarks)) {
        setResult({ type: "error", message: `Invalid marks for ${s.name}: must be 0-${totalMarks}` });
        return;
      }
    }

    setPending(true);
    setResult(null);

    const formData = new FormData();
    formData.set("subjectId", selectedSubject);
    formData.set("examType", examType);
    formData.set("totalMarks", totalMarks.toString());
    formData.set("academicYear", academicYear);

    for (const s of students) {
      const val = marks[s.id];
      if (val && val.trim() !== "") {
        formData.set(`marks_${s.id}`, val);
      }
    }

    const res = await uploadMarksBulk(formData);
    if (res.error) {
      setResult({ type: "error", message: res.error });
    } else {
      setResult({ type: "success", message: `Marks saved for ${res.count} students!` });
    }
    setPending(false);
  }

  // Stats
  const filledCount = students.filter((s) => marks[s.id] && marks[s.id].trim() !== "").length;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
          <CardDescription>Select the subject, exam type, and configure marks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select value={examType} onValueChange={handleExamChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {examTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total Marks</Label>
              <Input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(parseInt(e.target.value) || 100)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2025-2026"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students enrolled for the selected subject.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="secondary">{filledCount}/{students.length} entered</Badge>
              <Badge variant="secondary">Out of {totalMarks}</Badge>
            </div>
          </div>

          {/* Students Marks Entry */}
          <Card>
            <CardHeader>
              <CardTitle>
                {subjects.find((s) => s.id === selectedSubject)?.name} — {examType}
              </CardTitle>
              <CardDescription>
                Enter marks for each student. Grades are auto-calculated. Leave blank to skip.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Header row */}
              <div className="hidden sm:flex items-center gap-3 px-3 pb-2 text-xs font-medium text-muted-foreground border-b mb-2">
                <span className="w-6">#</span>
                <span className="w-8" />
                <span className="flex-1">Student</span>
                <span className="w-24 text-center">Marks</span>
                <span className="w-16 text-center">%</span>
                <span className="w-16 text-center">Grade</span>
              </div>

              <div className="space-y-2">
                {students.map((student, idx) => {
                  const val = marks[student.id] || "";
                  const numVal = parseFloat(val);
                  const hasValue = val.trim() !== "" && !isNaN(numVal);
                  const pct = hasValue && totalMarks > 0 ? Math.round((numVal / totalMarks) * 100) : null;
                  const grade = pct !== null ? gradeFromPercentage(pct) : null;

                  return (
                    <div
                      key={student.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        hasValue
                          ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/10"
                          : ""
                      }`}
                    >
                      <span className="text-xs font-medium text-muted-foreground w-6 text-right">
                        {idx + 1}.
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-[10px] font-semibold">
                          {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{student.name}</p>
                        <p className="text-[11px] text-muted-foreground">{student.rollNumber}</p>
                      </div>

                      {/* Marks Input */}
                      <div className="w-24">
                        <Input
                          type="number"
                          min={0}
                          max={totalMarks}
                          step={0.5}
                          value={val}
                          onChange={(e) =>
                            setMarks((prev) => ({ ...prev, [student.id]: e.target.value }))
                          }
                          className="h-8 text-center text-sm font-medium"
                          placeholder={`/ ${totalMarks}`}
                        />
                      </div>

                      {/* Percentage */}
                      <div className="w-16 text-center">
                        {pct !== null ? (
                          <span
                            className={`text-sm font-semibold ${
                              pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"
                            }`}
                          >
                            {pct}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </div>

                      {/* Grade */}
                      <div className="w-16 text-center">
                        {grade ? (
                          <Badge variant="secondary" className={`${gradeColor(grade)} text-xs`}>
                            {grade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-between">
            {result && (
              <p
                className={`text-sm font-medium ${
                  result.type === "success" ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {result.message}
              </p>
            )}
            <div className="ml-auto">
              <Button
                onClick={handleSubmit}
                disabled={pending || filledCount === 0}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
              >
                {pending ? "Saving..." : `Upload ${filledCount} Marks`}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
