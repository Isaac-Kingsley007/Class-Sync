<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Class Hub

## Description
A centralized platform for managing academic records. The system allows students to track their progress, faculty to manage classroom data, and admins to oversee the entire institution.

## Tech Stack
* **Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS + ShadcnUI (recommended for dashboards)
* **ORM:** Prisma
* **Database:** PostgreSQL (or your choice)
* **Package Manager:** pnpm

## Roles & Permissions

| Role | Access Level | Key Features |
| :--- | :--- | :--- |
| **Student** | Read-only (Own data) | View attendance, check grades, view profile. |
| **Faculty** | Read/Write (Assigned students) | Mark daily attendance, upload marks, update student info. |
| **Admin** | Full Access | Manage users (CRUD), assign roles, system-wide reports. |

## Information this App Manages
1. **Attendance:** Tracks daily presence per subject.
2. **Academic Records:** Manages marks, credits, and GPA calculation.
3. **User Profiles:** Stores basic info, department, and semester details.

<!-- END:nextjs-agent-rules -->
