# Class Hub

A centralized platform for managing academic records. The system allows students to track their progress, faculty to manage classroom data, and admins to oversee the entire institution.

## 🚀 Key Features

### Roles & Permissions
- **Student**: Read-only access to their own data. Can view attendance, check academic marks and GPA, and view their user profile.
- **Faculty**: Read/Write access for assigned students. Can mark daily attendance, bulk upload academic marks, and export attendance reports (Excel format).
- **Admin**: Full system access. Manages users (CRUD operations), assigns system roles, and oversees system-wide statistics.

### Core Modules
- **Attendance Tracking**: Manage daily presence per subject.
- **Academic Records**: Manage marks, credits, and perform GPA calculations.
- **User Profiles**: Store basic information, department, and semester details.

### Premium UI & Analytics
- **Dynamic Visualizations**: Built with Recharts to display interactive attendance and academic charts.
- **Data Export**: Faculty members can download detailed attendance reports via `xlsx`.
- **Modern Interface**: Animated split-screen login page, glassmorphism UI elements, global bespoke color scheme, and fully responsive layout powered by Tailwind CSS.

## 💻 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [ShadcnUI](https://ui.shadcn.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Others**: Recharts (Data Visualization), xlsx (Data Export), bcryptjs (Auth)

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (or npm/yarn)
- PostgreSQL Database

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd student-info-management
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/student_management"
   ```

4. **Initialize Database & Seed Data:**
   Run migrations and populate the database with default admin, faculty, and student profiles.
   ```bash
   pnpm dlx prisma migrate dev --name init
   pnpm run db:seed
   ```

5. **Start the Development Server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📝 Scripts

- `pnpm dev`: Starts the local Next.js development server.
- `pnpm build`: Builds the application for production.
- `pnpm start`: Runs the compiled Next.js production server.
- `pnpm lint`: Runs ESLint to catch formatting and code quality issues.
- `pnpm db:seed`: Seeds the PostgreSQL database with initial test users using Prisma.
