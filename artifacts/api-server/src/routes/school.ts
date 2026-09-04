import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import {
  CreateEventBody,
  CreateNoticeBody,
  CreateStudentBody,
  DeleteStudentParams,
  GetDashboardResponse,
  ListEventsResponse,
  ListLecturesResponse,
  ListNoticesResponse,
  ListResourcesQueryParams,
  ListResourcesResponse,
  ListStudentsQueryParams,
  ListStudentsResponse,
  ListTeachersResponse,
} from "@workspace/api-zod";

type Student = {
  id: number;
  name: string;
  admissionNumber: string;
  className: string;
  section: string;
  rollNumber: number;
  attendance: number;
  averageScore: number;
  achievementCount: number;
  parentContact: string | null;
  studentContact: string | null;
  address: string | null;
  email: string | null;
  avatar: string;
};

type Viewer = {
  role: "principal" | "student";
  studentId: number | null;
  id: string;
  name: string;
  email: string;
};

type Notice = {
  id: number;
  title: string;
  body: string;
  category: string;
  publishedAt: string;
  author: string;
  pinned: boolean;
};

type SchoolEvent = {
  id: number;
  title: string;
  date: string;
  type: string;
  description: string;
  color: string;
};

const students: Student[] = [
  {
    id: 1,
    name: "Aarav Sharma",
    admissionNumber: "VSS-2024-018",
    className: "XII",
    section: "A",
    rollNumber: 4,
    attendance: 96,
    averageScore: 91,
    achievementCount: 4,
    parentContact: "+91 98765 43210",
    studentContact: "+91 98111 00221",
    address: "Model Town, Rohtak",
    email: "aarav.sharma@student.vikasshiksha.edu.in",
    avatar: "AS",
  },
  {
    id: 2,
    name: "Ananya Verma",
    admissionNumber: "VSS-2023-042",
    className: "XI",
    section: "B",
    rollNumber: 12,
    attendance: 94,
    averageScore: 88,
    achievementCount: 3,
    parentContact: "+91 98110 22448",
    studentContact: "+91 98990 12009",
    address: "Civil Lines, Rohtak",
    email: "ananya.verma@student.vikasshiksha.edu.in",
    avatar: "AV",
  },
  {
    id: 3,
    name: "Kabir Singh",
    admissionNumber: "VSS-2022-007",
    className: "X",
    section: "A",
    rollNumber: 7,
    attendance: 89,
    averageScore: 84,
    achievementCount: 5,
    parentContact: "+91 99887 61234",
    studentContact: "+91 98722 44556",
    address: "Sector 3, Rohtak",
    email: "kabir.singh@student.vikasshiksha.edu.in",
    avatar: "KS",
  },
  {
    id: 4,
    name: "Ishita Mehra",
    admissionNumber: "VSS-2024-061",
    className: "XII",
    section: "B",
    rollNumber: 18,
    attendance: 97,
    averageScore: 94,
    achievementCount: 6,
    parentContact: "+91 98990 12345",
    studentContact: "+91 98120 77889",
    address: "D Model Town, Rohtak",
    email: "ishita.mehra@student.vikasshiksha.edu.in",
    avatar: "IM",
  },
  {
    id: 5,
    name: "Rohan Gupta",
    admissionNumber: "VSS-2023-029",
    className: "XI",
    section: "A",
    rollNumber: 9,
    attendance: 92,
    averageScore: 86,
    achievementCount: 2,
    parentContact: "+91 98220 33881",
    studentContact: "+91 98999 12001",
    address: "Ashoka Road, Rohtak",
    email: "rohan.gupta@student.vikasshiksha.edu.in",
    avatar: "RG",
  },
];

const teachers = [
  {
    id: 1,
    name: "Dr. Meera Kapoor",
    subject: "Physics",
    specialization: "Astrophysics & STEM",
    email: "meera.kapoor@vikasshiksha.edu.in",
    phone: "+91 98100 11223",
    experience: "14 years",
    initials: "MK",
    color: "violet",
  },
  {
    id: 2,
    name: "Mr. Sandeep Rao",
    subject: "Mathematics",
    specialization: "Calculus & Olympiad prep",
    email: "sandeep.rao@vikasshiksha.edu.in",
    phone: "+91 98990 33121",
    experience: "11 years",
    initials: "SR",
    color: "amber",
  },
  {
    id: 3,
    name: "Ms. Nandini Joshi",
    subject: "English",
    specialization: "Literature & Communication",
    email: "nandini.joshi@vikasshiksha.edu.in",
    phone: "+91 98711 88342",
    experience: "9 years",
    initials: "NJ",
    color: "mint",
  },
  {
    id: 4,
    name: "Mr. Vivek Menon",
    subject: "Computer Science",
    specialization: "AI & Data Science",
    email: "vivek.menon@vikasshiksha.edu.in",
    phone: "+91 99100 44567",
    experience: "8 years",
    initials: "VM",
    color: "blue",
  },
];

const resources = [
  { id: 1, title: "CBSE Mathematics — Board Exam Set", kind: "PYQ", subject: "Mathematics", className: "XII", year: 2024, pages: 18, downloads: 128 },
  { id: 2, title: "Physics Previous Year Questions", kind: "PYQ", subject: "Physics", className: "XII", year: 2023, pages: 24, downloads: 96 },
  { id: 3, title: "English Core Sample Paper", kind: "Sample paper", subject: "English", className: "XI", year: 2024, pages: 12, downloads: 74 },
  { id: 4, title: "Chemistry Revision Workbook", kind: "Study guide", subject: "Chemistry", className: "XII", year: 2023, pages: 32, downloads: 61 },
  { id: 5, title: "Mathematics Practice Set", kind: "Worksheet", subject: "Mathematics", className: "X", year: 2024, pages: 16, downloads: 88 },
];

const lectures = [
  { id: 1, title: "Electrostatics: Field & Potential", teacher: "Dr. Meera Kapoor", subject: "Physics", className: "XII A", duration: "42 min", scheduledAt: "Today · 4:00 PM", status: "live", meetingUrl: "https://meet.google.com/vss-physics" },
  { id: 2, title: "Differential Equations — Foundations", teacher: "Mr. Sandeep Rao", subject: "Mathematics", className: "XII A", duration: "55 min", scheduledAt: "Tomorrow · 3:30 PM", status: "upcoming", meetingUrl: "https://meet.google.com/vss-maths" },
  { id: 3, title: "The Last Lesson — Close Reading", teacher: "Ms. Nandini Joshi", subject: "English", className: "XII B", duration: "38 min", scheduledAt: "Fri, 12 Sep · 4:00 PM", status: "upcoming", meetingUrl: "https://meet.google.com/vss-english" },
];

const notices: Notice[] = [
  { id: 1, title: "Half-yearly examination schedule published", body: "The detailed schedule for Classes X–XII is now available in the academics section.", category: "Academics", publishedAt: "Today, 9:15 AM", author: "Office of the Principal", pinned: true },
  { id: 2, title: "Inter-house athletics trials", body: "Students can register for athletics trials with their sports captain by 14 September.", category: "Sports", publishedAt: "Yesterday", author: "Sports Department", pinned: true },
  { id: 3, title: "Teacher-parent meeting", body: "The next teacher-parent meeting will be held on Saturday, 20 September from 9:00 AM.", category: "General", publishedAt: "08 Sep 2025", author: "School Office", pinned: false },
];

const events: SchoolEvent[] = [
  { id: 1, title: "Teachers' Day", date: "2025-09-05", type: "Occasion", description: "Celebration and student-led assembly", color: "violet" },
  { id: 2, title: "Half-yearly examinations", date: "2025-09-15", type: "Examination", description: "Classes X, XI and XII", color: "amber" },
  { id: 3, title: "Inter-house athletics trials", date: "2025-09-18", type: "Sports", description: "Main ground · 3:30 PM", color: "mint" },
  { id: 4, title: "Gandhi Jayanti", date: "2025-10-02", type: "Holiday", description: "School holiday", color: "blue" },
];

const router: IRouter = Router();

function getViewer(req: Request): Viewer {
  const auth = getAuth(req);
  const claims = ("sessionClaims" in auth ? auth.sessionClaims : undefined) as
    | {
        sub?: string;
        email?: string;
        name?: string;
        publicMetadata?: { role?: string; studentId?: number };
        metadata?: { role?: string; studentId?: number };
      }
    | undefined;
  const role =
    claims?.publicMetadata?.role === "principal" ||
    claims?.metadata?.role === "principal" ||
    claims?.email?.endsWith("@vikasshiksha.edu.in")
      ? "principal"
      : "student";
  return {
    role,
    studentId: role === "student" ? claims?.publicMetadata?.studentId ?? 1 : null,
    id: claims?.sub ?? "signed-in-user",
    name: claims?.name ?? (role === "principal" ? "School Principal" : "Student"),
    email: claims?.email ?? "account@vikasshiksha.edu.in",
  };
}

function requireSignedIn(req: Request, res: Response): Viewer | null {
  const viewer = getViewer(req);
  if (!viewer.id || viewer.id === "signed-in-user") {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return viewer;
}

function visibleStudent(student: Student, viewer: Viewer): Student {
  if (viewer.role === "principal" || viewer.studentId === student.id) return student;
  return {
    ...student,
    parentContact: null,
    studentContact: null,
    address: null,
    email: null,
  };
}

router.get("/profile", (req, res) => {
  const viewer = requireSignedIn(req, res);
  if (!viewer) return;
  res.json({
    id: viewer.id,
    name: viewer.name,
    email: viewer.email,
    role: viewer.role,
    studentId: viewer.studentId,
  });
});

router.get("/dashboard", (_req, res) => {
  res.json(GetDashboardResponse.parse({
    studentCount: students.length + 1214,
    teacherCount: teachers.length + 38,
    attendance: 94.2,
    upcomingExams: 3,
    recentActivity: [
      { id: 1, title: "New achievement added", detail: "Ishita Mehra · District science quiz", time: "12 min ago", tone: "violet" },
      { id: 2, title: "Notice published", detail: "Half-yearly examination schedule", time: "1 hr ago", tone: "amber" },
      { id: 3, title: "Lecture uploaded", detail: "Electrostatics: Field & Potential", time: "3 hrs ago", tone: "blue" },
      { id: 4, title: "Student record updated", detail: "Kabir Singh · Class X A", time: "Yesterday", tone: "mint" },
    ],
  }));
});

router.get("/students", (req, res) => {
  const viewer = requireSignedIn(req, res);
  if (!viewer) return;
  const parsed = ListStudentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const search = parsed.data.search?.toLowerCase();
  const className = parsed.data.className;
  const accessibleStudents = viewer.role === "principal"
    ? students
    : students.filter((student) => student.id === viewer.studentId);
  const filtered = accessibleStudents.filter((student) =>
    (!search || [student.name, student.admissionNumber, student.className].some((value) => value.toLowerCase().includes(search))) &&
    (!className || student.className === className),
  );
  res.json(ListStudentsResponse.parse(filtered.map((student) => visibleStudent(student, viewer))));
});

router.post("/students", (req, res) => {
  const viewer = requireSignedIn(req, res);
  if (!viewer || viewer.role !== "principal") {
    if (viewer) res.status(403).json({ error: "Only the principal can add students" });
    return;
  }
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const student: Student = {
    ...parsed.data,
    id: Math.max(...students.map((item) => item.id), 0) + 1,
    attendance: 100,
    averageScore: 0,
    achievementCount: 0,
    studentContact: parsed.data.studentContact,
    address: parsed.data.address,
    email: parsed.data.email,
    avatar: parsed.data.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
  };
  students.unshift(student);
  res.status(201).json(student);
});

router.delete("/students/:id", (req, res) => {
  const viewer = requireSignedIn(req, res);
  if (!viewer || viewer.role !== "principal") {
    if (viewer) res.status(403).json({ error: "Only the principal can remove students" });
    return;
  }
  const parsed = DeleteStudentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const index = students.findIndex((student) => student.id === parsed.data.id);
  if (index === -1) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  students.splice(index, 1);
  res.sendStatus(204);
});

router.get("/teachers", (_req, res) => res.json(ListTeachersResponse.parse(teachers)));

router.get("/resources", (req, res) => {
  const parsed = ListResourcesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const filtered = resources.filter((resource) =>
    (!parsed.data.kind || resource.kind === parsed.data.kind) &&
    (!parsed.data.className || resource.className === parsed.data.className),
  );
  res.json(ListResourcesResponse.parse(filtered));
});

router.get("/notices", (_req, res) => res.json(ListNoticesResponse.parse(notices)));

router.post("/notices", (req, res) => {
  const parsed = CreateNoticeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const notice: Notice = {
    ...parsed.data,
    id: Math.max(...notices.map((item) => item.id), 0) + 1,
    publishedAt: "Just now",
    author: "School Office",
    pinned: parsed.data.pinned ?? false,
  };
  notices.unshift(notice);
  res.status(201).json(notice);
});

router.get("/events", (_req, res) => res.json(ListEventsResponse.parse(events)));

router.post("/events", (req, res) => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const event: SchoolEvent = {
    ...parsed.data,
    id: Math.max(...events.map((item) => item.id), 0) + 1,
    color: parsed.data.color ?? "blue",
  };
  events.push(event);
  res.status(201).json(event);
});

router.get("/lectures", (_req, res) => res.json(ListLecturesResponse.parse(lectures)));

export default router;