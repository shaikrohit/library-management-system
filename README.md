# Library Management System

**Student:** Shaik Rohit (Roll No: `26MLA08010`)  
**Institution:** Madanapalle Institute of Technology & Science (MITS)  
**Department:** Computer Science and Engineering (Cyber Security) — B.Tech  
**Subject:** Database Concepts and Application Laboratory  

---

## Overview

A full-stack academic Library Management System built with **React + Vite + TypeScript**, **Supabase PostgreSQL 17**, **Supabase Auth**, and **Netlify** static hosting.

### Key Features

- **Books & Authors (`M:N`):** ISBN-keyed catalog with multi-author linking via `BOOK_AUTHOR` and real-time availability derived from active borrowing records.
- **Role-Based Access Control:** Separate Administrator/Librarian and Member portals protected by PostgreSQL Row Level Security (RLS) and `SECURITY DEFINER` stored procedures.
- **Book Issue & Atomic Return:** Partial unique index prevents issuing an already borrowed book. Returning an overdue book atomically updates `Return_Date` and creates a `Pending` fine at **₹5 per overdue calendar day**.
- **Fine Management & Reports:** Librarians can mark pending fines as `Paid`, view overdue summaries, and export borrowing ledgers to CSV.

### Tech Stack

- **Frontend:** React 19, Vite 6, TypeScript, CSS, `lucide-react`
- **Backend & Database:** Supabase PostgreSQL 17, Supabase Auth, `@supabase/supabase-js`, PL/pgSQL RPCs, RLS
- **Hosting:** Netlify (Free Plan)
- **Version Control:** GitHub

### Documentation

- [ER Diagram](docs/ER-Diagram.md)
- [Database Schema](docs/Database-Schema.md)
- [Normalization Analysis](docs/Normalization.md)
- [System Architecture](docs/Architecture.md)
- [Deployment Guide](docs/Deployment-Guide.md)
- [Testing Results](docs/Testing-Results.md)
