# UCMAS Cape Coast Management System

A comprehensive, enterprise-grade management console designed for the **UCMAS Ghana (Cape Coast)** franchise. This system streamlines academic tracking, student attendance, financial management, and multi-branch operations.

## 🌟 Features

- **Multi-Branch Management**: Centralized control for several locations (Cape Coast, Accra, Kumasi, Takoradi, etc.).
- **Academic Performance Tracking**: Detailed grading for Mental Arithmetic, Abacus Proficiency, Listening, and Vision.
- **Attendance Monitoring**: Digital registers for students and staff with real-time reporting.
- **Financial Module**: Track student fee accounts, process payments, and generate automated receipts.
- **Data Reassignment**: Powerful tools to transfer students and classes between branches/schools seamlessly.
- **Role-Based Access**: Secure portals for Administrators, Managers, and Teachers.

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: MySQL.
- **Authentication**: JWT & Bcrypt.

## 🛠️ Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS)
- [MySQL](https://www.mysql.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/michelleamfo2007-blip/ucmas-cape-coast-management-system.git
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your MySQL credentials:
   ```env
   MYSQL_HOST=localhost
   MYSQL_USER=your_user
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=ucmas
   JWT_SECRET=your_secure_secret
   ```

4. **Initialize Database**:
   The system will automatically create and seed the database on the first run. Ensure MySQL is running.

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The site will be available at [http://localhost:3000](http://localhost:3000).

## 🔐 Default Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Teacher** | `tutor1` | `teacher123` |

---
© 2026 UCMAS Ghana - Management System
