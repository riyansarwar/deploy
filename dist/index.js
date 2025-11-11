var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  attemptEvents: () => attemptEvents,
  classStudents: () => classStudents,
  classes: () => classes,
  insertClassSchema: () => insertClassSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertPracticeQuizQuestionSchema: () => insertPracticeQuizQuestionSchema,
  insertPracticeQuizSchema: () => insertPracticeQuizSchema,
  insertQuestionSchema: () => insertQuestionSchema,
  insertQuizSchema: () => insertQuizSchema,
  insertStudentAnswerSchema: () => insertStudentAnswerSchema,
  insertStudentQuizSchema: () => insertStudentQuizSchema,
  insertUserSchema: () => insertUserSchema,
  notifications: () => notifications,
  practiceQuizQuestions: () => practiceQuizQuestions,
  practiceQuizzes: () => practiceQuizzes,
  questions: () => questions,
  quizQuestions: () => quizQuestions,
  quizzes: () => quizzes,
  studentAnswers: () => studentAnswers,
  studentQuizzes: () => studentQuizzes,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("student"),
  // "student" or "teacher"
  createdAt: timestamp("created_at").defaultNow()
});
var questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  chapter: text("chapter"),
  // nullable - for organizing questions within subjects
  gradeLevel: text("grade_level").notNull(),
  type: text("type").notNull(),
  // short_answer (BSCS focus)
  content: text("content").notNull(),
  answer: text("answer").notNull(),
  difficulty: text("difficulty").notNull(),
  // easy, medium, hard
  createdAt: timestamp("created_at").defaultNow()
});
var quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  classId: integer("class_id").notNull().references(() => classes.id),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  gradeLevel: text("grade_level").notNull(),
  duration: integer("duration").notNull(),
  // in minutes
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").notNull().default("draft"),
  // draft, scheduled, active, completed
  createdAt: timestamp("created_at").defaultNow()
});
var quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  order: integer("order").notNull()
});
var studentQuizzes = pgTable("student_quizzes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id),
  score: integer("score"),
  status: text("status").notNull().default("assigned"),
  // assigned, in_progress, completed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // Proctoring additions
  questionOrder: json("question_order"),
  // array of question IDs in fixed randomized order for this attempt
  endsAt: timestamp("ends_at"),
  // when the attempt should auto-submit
  enforceFullscreen: boolean("enforce_fullscreen").notNull().default(true)
});
var studentAnswers = pgTable("student_answers", {
  id: serial("id").primaryKey(),
  studentQuizId: integer("student_quiz_id").notNull().references(() => studentQuizzes.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answer: text("answer").notNull(),
  codeAnswer: text("code_answer"),
  // For code-based questions
  codeOutput: text("code_output"),
  // Execution output
  codeError: text("code_error"),
  // Compilation/runtime errors
  score: integer("score"),
  feedback: text("feedback"),
  aiAnalysis: json("ai_analysis")
});
var classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  gradeLevel: text("grade_level").notNull()
});
var classStudents = pgTable("class_students", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id),
  studentId: integer("student_id").notNull().references(() => users.id)
});
var practiceQuizzes = pgTable("practice_quizzes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  chapter: text("chapter"),
  // nullable - tracks which chapter was selected
  questionCount: integer("question_count").notNull(),
  score: integer("score"),
  status: text("status").notNull().default("in_progress"),
  // in_progress, completed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});
var practiceQuizQuestions = pgTable("practice_quiz_questions", {
  id: serial("id").primaryKey(),
  practiceQuizId: integer("practice_quiz_id").notNull().references(() => practiceQuizzes.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answer: text("answer"),
  score: integer("score"),
  feedback: text("feedback"),
  aiAnalysis: json("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow()
}, (t) => ({
  uniqueQuizQuestion: unique().on(t.practiceQuizId, t.questionId)
}));
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  // quiz_assigned, practice_result, etc.
  read: boolean("read").notNull().default(false),
  relatedId: integer("related_id"),
  // Can be a quizId, practiceQuizId, etc.
  createdAt: timestamp("created_at").defaultNow()
});
var attemptEvents = pgTable("attempt_events", {
  id: serial("id").primaryKey(),
  studentQuizId: integer("student_quiz_id").notNull().references(() => studentQuizzes.id),
  type: text("type").notNull(),
  // tab_blur, visibility_hidden, fullscreen_exit, suspicious_face, timeout_submit, manual_submit
  details: json("details"),
  // optional metadata (timestamps, confidence, etc.)
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true }).extend({
  confirmPassword: z.string()
});
var insertQuestionSchema = createInsertSchema(questions).omit({ id: true, createdAt: true });
var insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true }).extend({
  scheduledAt: z.coerce.date().optional()
});
var insertStudentQuizSchema = createInsertSchema(studentQuizzes).omit({ id: true, score: true, startedAt: true, completedAt: true });
var insertStudentAnswerSchema = createInsertSchema(studentAnswers).omit({ id: true, score: true, feedback: true, aiAnalysis: true });
var insertClassSchema = createInsertSchema(classes).omit({ id: true });
var insertPracticeQuizSchema = createInsertSchema(practiceQuizzes).omit({ id: true, createdAt: true, completedAt: true, score: true });
var insertPracticeQuizQuestionSchema = createInsertSchema(practiceQuizQuestions).omit({ id: true, createdAt: true, answer: true, score: true, feedback: true, aiAnalysis: true });
var insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, read: true });

// server/db.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.resolve("C:/Users/pro3/Downloads/PerceiveGrade/PerceiveGrade/.env")
});
var databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set. Please add your database connection string.");
}
var client = postgres(databaseUrl);
var db = drizzle(client, { schema: schema_exports });

// server/storage.ts
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
var Storage = class {
  // User operations with database
  async createUser(userData) {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
  async getUserByEmail(email) {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return void 0;
    }
  }
  async getUserById(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return void 0;
    }
  }
  async getUser(id) {
    return this.getUserById(id);
  }
  async getUserByUsername(username) {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return void 0;
    }
  }
  async getUsersByRole(role) {
    try {
      return await db.select().from(users).where(eq(users.role, role));
    } catch (error) {
      console.error("Error getting users by role:", error);
      return [];
    }
  }
  // Update basic profile fields (firstName, lastName, email)
  async updateUserProfile(id, updates) {
    const updateData = {};
    if (typeof updates.firstName === "string") updateData.firstName = updates.firstName;
    if (typeof updates.lastName === "string") updateData.lastName = updates.lastName;
    if (typeof updates.email === "string") updateData.email = updates.email;
    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updated;
  }
  // Update password hash
  async updateUserPassword(id, passwordHash) {
    await db.update(users).set({ password: passwordHash }).where(eq(users.id, id));
  }
  // Questions
  async createQuestion(questionData) {
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }
  async getQuestions() {
    return await db.select().from(questions).orderBy(desc(questions.createdAt));
  }
  async getQuestion(id) {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }
  async getQuestionsBySubject(subject) {
    return await db.select().from(questions).where(eq(questions.subject, subject));
  }
  async searchQuestions(filters) {
    try {
      let query = db.select().from(questions);
      const conditions = [];
      if (filters.subject) {
        conditions.push(eq(questions.subject, filters.subject));
      }
      if (filters.chapter) {
        conditions.push(
          or(
            ilike(questions.chapter, `%${filters.chapter}%`),
            ilike(questions.subject, `%${filters.chapter}%`)
          )
        );
      }
      if (filters.gradeLevel) {
        conditions.push(eq(questions.gradeLevel, filters.gradeLevel));
      }
      if (filters.type) {
        conditions.push(eq(questions.type, filters.type));
      }
      if (filters.difficulty) {
        conditions.push(eq(questions.difficulty, filters.difficulty));
      }
      if (filters.searchTerm) {
        conditions.push(
          or(
            ilike(questions.content, `%${filters.searchTerm}%`),
            ilike(questions.subject, `%${filters.searchTerm}%`),
            ilike(questions.answer, `%${filters.searchTerm}%`),
            ilike(questions.chapter, `%${filters.searchTerm}%`)
          )
        );
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      const result = await query.orderBy(desc(questions.createdAt));
      return result;
    } catch (error) {
      console.error("Error searching questions:", error);
      return [];
    }
  }
  async updateQuestion(id, questionData) {
    const [updatedQuestion] = await db.update(questions).set(questionData).where(eq(questions.id, id)).returning();
    return updatedQuestion;
  }
  async deleteQuestion(id) {
    await db.delete(questions).where(eq(questions.id, id));
  }
  // Quizzes
  async createQuiz(quizData) {
    const [quiz] = await db.insert(quizzes).values(quizData).returning();
    return quiz;
  }
  async getQuizzes() {
    return await db.select().from(quizzes).orderBy(desc(quizzes.createdAt));
  }
  async getQuiz(id) {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }
  async updateQuiz(id, quizData) {
    const [updatedQuiz] = await db.update(quizzes).set(quizData).where(eq(quizzes.id, id)).returning();
    return updatedQuiz;
  }
  async deleteQuiz(id) {
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, id));
    await db.delete(studentQuizzes).where(eq(studentQuizzes.quizId, id));
    await db.delete(quizzes).where(eq(quizzes.id, id));
  }
  async getQuizzesByTeacher(teacherId) {
    return await db.select().from(quizzes).where(eq(quizzes.teacherId, teacherId)).orderBy(desc(quizzes.createdAt));
  }
  // Classes
  async createClass(classData) {
    const [newClass] = await db.insert(classes).values(classData).returning();
    return newClass;
  }
  async getClassByNameAndTeacher(name, teacherId) {
    const [existingClass] = await db.select().from(classes).where(and(eq(classes.name, name), eq(classes.teacherId, teacherId)));
    return existingClass;
  }
  // Student-teacher relationships
  async getClassesByStudent(studentId) {
    const result = await db.select({
      class: classes
    }).from(classStudents).innerJoin(classes, eq(classStudents.classId, classes.id)).where(eq(classStudents.studentId, studentId));
    return result.map((r) => r.class);
  }
  async getClass(id) {
    const [classRecord] = await db.select().from(classes).where(eq(classes.id, id));
    return classRecord;
  }
  async getStudentsByClass(classId) {
    const result = await db.select({
      student: users
    }).from(classStudents).innerJoin(users, eq(classStudents.studentId, users.id)).where(eq(classStudents.classId, classId));
    return result.map((r) => r.student);
  }
  async getQuizzesByClass(classId) {
    return await db.select().from(quizzes).where(eq(quizzes.classId, classId)).orderBy(desc(quizzes.createdAt));
  }
  async getStudentPerformanceByClass(classId) {
    const result = await db.select({
      studentId: users.id,
      studentName: users.firstName,
      studentLastName: users.lastName,
      studentEmail: users.email,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      score: studentQuizzes.score,
      completedAt: studentQuizzes.completedAt
    }).from(users).innerJoin(classStudents, eq(users.id, classStudents.studentId)).leftJoin(studentQuizzes, eq(users.id, studentQuizzes.studentId)).leftJoin(quizzes, and(
      eq(studentQuizzes.quizId, quizzes.id),
      eq(quizzes.classId, classId)
    )).where(eq(classStudents.classId, classId));
    const performanceMap = /* @__PURE__ */ new Map();
    result.forEach((row) => {
      const key = row.studentId;
      if (!performanceMap.has(key)) {
        performanceMap.set(key, {
          studentId: row.studentId,
          studentName: `${row.studentName} ${row.studentLastName}`,
          studentEmail: row.studentEmail,
          scores: [],
          quizzesCompleted: 0
        });
      }
      if (row.score !== null) {
        const student = performanceMap.get(key);
        student.scores.push(row.score);
        student.quizzesCompleted++;
      }
    });
    return Array.from(performanceMap.values()).map((student) => ({
      ...student,
      averageScore: student.scores.length > 0 ? student.scores.reduce((a, b) => a + b, 0) / student.scores.length : null
    }));
  }
  async removeStudentFromClass(classId, studentId) {
    await db.delete(classStudents).where(and(
      eq(classStudents.classId, classId),
      eq(classStudents.studentId, studentId)
    ));
  }
  async addQuestionToQuiz(quizId, questionId, order) {
    await db.insert(quizQuestions).values({
      quizId,
      questionId,
      order
    });
  }
  async getClassStudents(classId) {
    const result = await db.select({
      student: users
    }).from(classStudents).innerJoin(users, eq(classStudents.studentId, users.id)).where(eq(classStudents.classId, classId));
    return result.map((r) => r.student);
  }
  async assignQuizToStudent(quizId, studentId) {
    await db.insert(studentQuizzes).values({
      quizId,
      studentId,
      status: "assigned"
    });
  }
  // ----- Student quizzes and answers (needed by routes) -----
  async getStudentQuiz(id) {
    const [row] = await db.select().from(studentQuizzes).where(eq(studentQuizzes.id, id));
    return row;
  }
  async getStudentQuizzesByStudent(studentId) {
    return await db.select().from(studentQuizzes).where(eq(studentQuizzes.studentId, studentId));
  }
  async getStudentQuizzesByQuiz(quizId) {
    return await db.select().from(studentQuizzes).where(eq(studentQuizzes.quizId, quizId));
  }
  async getAttemptsWithUsersByQuiz(quizId) {
    const result = await db.select({
      attempt: studentQuizzes,
      student: users
    }).from(studentQuizzes).innerJoin(users, eq(studentQuizzes.studentId, users.id)).where(eq(studentQuizzes.quizId, quizId));
    return result.map((r) => ({ ...r.attempt, student: {
      id: r.student.id,
      firstName: r.student.firstName,
      lastName: r.student.lastName,
      email: r.student.email
    } }));
  }
  async submitStudentAnswer(data) {
    const [row] = await db.insert(studentAnswers).values({
      studentQuizId: data.studentQuizId,
      questionId: data.questionId,
      answer: data.answer,
      codeAnswer: data.codeAnswer,
      codeOutput: data.codeOutput,
      codeError: data.codeError
    }).returning();
    return row;
  }
  async getStudentAnswersByQuiz(studentQuizId) {
    return await db.select().from(studentAnswers).where(eq(studentAnswers.studentQuizId, studentQuizId));
  }
  async updateStudentQuizStatus(id, status, score) {
    const [row] = await db.update(studentQuizzes).set({ status, startedAt: status === "in_progress" ? /* @__PURE__ */ new Date() : void 0, completedAt: status === "completed" ? /* @__PURE__ */ new Date() : void 0, score }).where(eq(studentQuizzes.id, id)).returning();
    return row;
  }
  // Grading functions
  async updateStudentAnswerScore(studentQuizId, questionId, score, feedback) {
    const [row] = await db.update(studentAnswers).set({ score, feedback }).where(and(
      eq(studentAnswers.studentQuizId, studentQuizId),
      eq(studentAnswers.questionId, questionId)
    )).returning();
    return row;
  }
  async getStudentAnswer(studentQuizId, questionId) {
    const [row] = await db.select().from(studentAnswers).where(and(
      eq(studentAnswers.studentQuizId, studentQuizId),
      eq(studentAnswers.questionId, questionId)
    ));
    return row;
  }
  // ----- Proctoring helpers -----
  async setAttemptPlan(id, questionOrder, endsAt, enforceFullscreen = true) {
    const [row] = await db.update(studentQuizzes).set({ questionOrder, endsAt, enforceFullscreen }).where(eq(studentQuizzes.id, id)).returning();
    return row;
  }
  async logAttemptEvent(studentQuizId, type, details) {
    const [row] = await db.insert(attemptEvents).values({ studentQuizId, type, details }).returning();
    return row;
  }
  async getAttemptEvents(studentQuizId, limit = 200) {
    return await db.select().from(attemptEvents).where(eq(attemptEvents.studentQuizId, studentQuizId)).orderBy(desc(attemptEvents.createdAt)).limit(limit);
  }
  async countRecentViolationEvents(studentQuizId, types, sinceMs) {
    const since = new Date(Date.now() - sinceMs);
    const rows = await db.select().from(attemptEvents).where(and(
      eq(attemptEvents.studentQuizId, studentQuizId),
      sql`${attemptEvents.createdAt} >= ${since}`
    ));
    const set = new Set(types);
    return rows.filter((r) => set.has(r.type)).length;
  }
  async getQuizQuestions(quizId) {
    const result = await db.select({
      question: questions
    }).from(quizQuestions).innerJoin(questions, eq(quizQuestions.questionId, questions.id)).where(eq(quizQuestions.quizId, quizId)).orderBy(quizQuestions.order);
    return result.map((r) => r.question);
  }
  async updateQuizQuestions(quizId, questionIds) {
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    if (questionIds.length > 0) {
      await Promise.all(questionIds.map(async (questionId, index) => {
        await this.addQuestionToQuiz(quizId, questionId, index + 1);
      }));
    }
  }
  // Notification methods  
  async createNotification(notification) {
    const [newNotification] = await db.insert(notifications).values({
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      relatedId: notification.relatedId,
      read: false,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return newNotification;
  }
  async markNotificationAsRead(notificationId) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, notificationId));
  }
  // Quiz-related methods
  async getQuizzesByTeacher(teacherId) {
    return await db.select().from(quizzes).where(eq(quizzes.teacherId, teacherId)).orderBy(desc(quizzes.createdAt));
  }
  async updateClass(id, classData) {
    const [updatedClass] = await db.update(classes).set(classData).where(eq(classes.id, id)).returning();
    return updatedClass;
  }
  async deleteClass(id) {
    await db.delete(classStudents).where(eq(classStudents.classId, id));
    await db.delete(classes).where(eq(classes.id, id));
  }
  async getClasses() {
    return await db.select().from(classes);
  }
  async getClass(id) {
    const [classItem] = await db.select().from(classes).where(eq(classes.id, id));
    return classItem;
  }
  async getClassesByTeacher(teacherId) {
    return await db.select().from(classes).where(eq(classes.teacherId, teacherId));
  }
  async addStudentToClass(classId, studentId) {
    try {
      console.log("DEBUG: addStudentToClass called with:", { classId, studentId });
      if (classId === void 0 || studentId === void 0) {
        console.error("UNDEFINED VALUES:", { classId, studentId });
        return false;
      }
      await db.insert(classStudents).values({ classId, studentId });
      return true;
    } catch (error) {
      console.error("Error adding student to class:", error);
      return false;
    }
  }
  async getClassStudents(classId) {
    const result = await db.select({
      user: users
    }).from(classStudents).innerJoin(users, eq(classStudents.studentId, users.id)).where(eq(classStudents.classId, classId));
    return result.map((r) => r.user);
  }
  // Quiz assignments
  async assignQuizToStudent(quizId, studentId) {
    try {
      await db.insert(studentQuizzes).values({
        quizId,
        studentId,
        status: "assigned"
      });
      return true;
    } catch (error) {
      console.error("Error assigning quiz to student:", error);
      return false;
    }
  }
  // Practice Quizzes
  async createPracticeQuiz(practiceQuizData) {
    const [practiceQuiz] = await db.insert(practiceQuizzes).values(practiceQuizData).returning();
    return practiceQuiz;
  }
  async getPracticeQuiz(id) {
    const [practiceQuiz] = await db.select().from(practiceQuizzes).where(eq(practiceQuizzes.id, id));
    return practiceQuiz;
  }
  async getPracticeQuizzesByStudent(studentId) {
    return await db.select().from(practiceQuizzes).where(eq(practiceQuizzes.studentId, studentId)).orderBy(desc(practiceQuizzes.createdAt));
  }
  async addQuestionToPracticeQuiz(practiceQuizId, questionId) {
    const [practiceQuizQuestion] = await db.insert(practiceQuizQuestions).values({ practiceQuizId, questionId }).returning();
    return practiceQuizQuestion;
  }
  async getPracticeQuizQuestions(practiceQuizId) {
    const result = await db.select({
      question: questions
    }).from(practiceQuizQuestions).innerJoin(questions, eq(practiceQuizQuestions.questionId, questions.id)).where(eq(practiceQuizQuestions.practiceQuizId, practiceQuizId));
    return result.map((r) => r.question);
  }
  async submitPracticeQuizAnswer(practiceQuizId, questionId, answer, score, feedback, analysis) {
    const existingAnswer = await db.select().from(practiceQuizQuestions).where(
      and(
        eq(practiceQuizQuestions.practiceQuizId, practiceQuizId),
        eq(practiceQuizQuestions.questionId, questionId)
      )
    );
    if (existingAnswer.length > 0) {
      const [updated] = await db.update(practiceQuizQuestions).set({
        answer,
        score,
        feedback,
        aiAnalysis: analysis
      }).where(
        and(
          eq(practiceQuizQuestions.practiceQuizId, practiceQuizId),
          eq(practiceQuizQuestions.questionId, questionId)
        )
      ).returning();
      return updated;
    } else {
      const [inserted] = await db.insert(practiceQuizQuestions).values({
        practiceQuizId,
        questionId,
        answer,
        score,
        feedback,
        aiAnalysis: analysis
      }).returning();
      return inserted;
    }
  }
  async updatePracticeQuizStatus(practiceQuizId, status, score) {
    const updateData = { status };
    if (score !== void 0) {
      updateData.score = score;
    }
    if (status === "completed") {
      updateData.completedAt = /* @__PURE__ */ new Date();
    }
    const [updated] = await db.update(practiceQuizzes).set(updateData).where(eq(practiceQuizzes.id, practiceQuizId)).returning();
    return updated;
  }
  async getPracticeQuizAnswers(practiceQuizId) {
    return await db.select().from(practiceQuizQuestions).where(eq(practiceQuizQuestions.practiceQuizId, practiceQuizId));
  }
  // Distinct chapter options (includes fallback to subject for legacy rows)
  async getChapterOptions() {
    try {
      const rows = await db.select({ chapter: questions.chapter, subject: questions.subject }).from(questions);
      const set = /* @__PURE__ */ new Set();
      for (const r of rows) {
        const ch = (r.chapter || "").trim();
        const subj = (r.subject || "").trim();
        if (ch) set.add(ch);
        if (subj) set.add(subj);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error("Error getting chapter options:", error);
      return [];
    }
  }
  // Notifications
  async getNotificationsByUser(userId) {
    try {
      const userNotifications = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
      return userNotifications;
    } catch (error) {
      console.error("Error getting notifications by user:", error);
      return [];
    }
  }
};
var storage = new Storage();
async function initializeSampleData() {
  try {
    console.log("Initializing sample data...");
    const sampleUsers = [
      {
        username: "teacher1",
        email: "teacher@example.com",
        password: "password",
        firstName: "John",
        lastName: "Smith",
        role: "teacher"
      },
      {
        username: "student1",
        email: "student1@example.com",
        password: "password",
        firstName: "Alice",
        lastName: "Johnson",
        role: "student"
      },
      {
        username: "student2",
        email: "student2@example.com",
        password: "password",
        firstName: "Bob",
        lastName: "Wilson",
        role: "student"
      }
    ];
    for (const user of sampleUsers) {
      try {
        await db.insert(users).values(user).onConflictDoNothing();
      } catch (error) {
      }
    }
    const sampleQuestions = [
      {
        teacherId: 1,
        content: "Explain the difference between encapsulation and abstraction in object-oriented programming.",
        type: "short_answer",
        answer: "Encapsulation is the practice of bundling data and methods that operate on that data within a single unit (class) and restricting access to some components. Abstraction is the concept of hiding complex implementation details while showing only essential features of an object.",
        subject: "Object-Oriented Programming",
        gradeLevel: "University",
        difficulty: "Medium"
      },
      {
        teacherId: 1,
        content: "What is the time complexity of searching for an element in a balanced binary search tree?",
        type: "short_answer",
        answer: "O(log n) where n is the number of nodes in the tree.",
        subject: "Data Structures & Algorithms",
        gradeLevel: "University",
        difficulty: "Easy"
      },
      {
        teacherId: 1,
        content: "Describe the purpose of the TCP three-way handshake in network communication.",
        type: "short_answer",
        answer: "The TCP three-way handshake establishes a reliable connection between client and server by exchanging SYN, SYN-ACK, and ACK packets to synchronize sequence numbers and ensure both parties are ready for data transmission.",
        subject: "Computer Networks",
        gradeLevel: "University",
        difficulty: "Medium"
      },
      {
        teacherId: 1,
        content: "What is database normalization and why is it important?",
        type: "short_answer",
        answer: "Database normalization is the process of organizing data to reduce redundancy and improve data integrity. It's important because it eliminates data duplication, reduces storage space, and prevents update anomalies.",
        subject: "Database Systems",
        gradeLevel: "University",
        difficulty: "Medium"
      },
      {
        teacherId: 1,
        content: "Explain the concept of version control in software development.",
        type: "short_answer",
        answer: "Version control is a system that tracks changes to files over time, allowing developers to collaborate, maintain history of changes, revert to previous versions, and manage different branches of development.",
        subject: "Software Engineering",
        gradeLevel: "University",
        difficulty: "Easy"
      }
    ];
    for (const question of sampleQuestions) {
      try {
        await db.insert(questions).values(question).onConflictDoNothing();
      } catch (error) {
      }
    }
    console.log("Sample data initialized successfully");
  } catch (error) {
    console.error("Error initializing sample data:", error);
  }
}

// server/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
function setupAuth(app2) {
  app2.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role, username } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await storage.createUser({
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role
      });
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        message: "User created successfully",
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/login", async (req, res) => {
    try {
      const { username, password, role } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (role && role !== user.role) {
        return res.status(401).json({
          message: `Invalid role. You are registered as a ${user.role}, please select the ${user.role} role to login.`
        });
      }
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "Login successful",
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/user", authenticateToken, async (req, res) => {
    try {
      const { password: _, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/logout", async (req, res) => {
    res.json({ message: "Logout successful" });
  });
}

// server/routes.ts
import { fromZodError } from "zod-validation-error";

// server/openai.ts
import OpenAI from "openai";
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "your-api-key" });
function getSubjectSpecificGradingCriteria(subject) {
  const normalizedSubject = subject.toLowerCase().trim();
  if (normalizedSubject.includes("data struct") || normalizedSubject.includes("algorithm")) {
    return `
      For Data Structures and Algorithms questions, evaluate based on:
      
      1. Correctness (0-10):
         - Algorithm correctness: Does the solution produce correct results?
         - Edge case handling: Does it handle boundary conditions and special cases?
         - Time complexity: Is the time complexity appropriate for the problem?
         - Space complexity: Is the space complexity optimized?
      
      2. Completeness (0-10):
         - Problem understanding: Does the solution address all requirements?
         - Analysis thoroughness: Is the complexity analysis complete and accurate?
         - Implementation details: Are all necessary steps implemented?
         - Testing considerations: Are potential test cases addressed?
      
      3. Relevance (0-10):
         - Algorithm selection: Is the most appropriate algorithm chosen?
         - Data structure selection: Is the most efficient data structure used?
         - Optimization techniques: Are appropriate optimizations applied?
         - Code readability: Is the solution well-structured and documented?
      
      Key concepts to check for understanding:
      - Time and space complexity analysis (Big O notation)
      - Array and linked data structures (arrays, linked lists, stacks, queues)
      - Tree and graph algorithms (traversal, shortest path, etc.)
      - Searching and sorting techniques
      - Dynamic programming
      - Greedy algorithms
      - Divide and conquer approaches
      - Hashing and indexing
      
      Common misconceptions to identify:
      - Incorrect complexity analysis
      - Inefficient algorithm selection
      - Confusion between similar data structures
      - Overlooking edge cases
      - Unnecessary complexity in solutions
    `;
  } else if (normalizedSubject.includes("database") || normalizedSubject.includes("sql")) {
    return `
      For Database Systems and SQL questions, evaluate based on:
      
      1. Correctness (0-10):
         - Query correctness: Does the SQL query return the expected results?
         - Syntax accuracy: Is the SQL syntax valid?
         - Schema design: Is the database schema properly designed?
         - Normalization: Are normalization principles correctly applied?
      
      2. Completeness (0-10):
         - Query coverage: Does the solution address all requirements?
         - Constraint handling: Are all necessary constraints defined?
         - Transaction management: Is transaction behavior considered?
         - Security considerations: Are access controls properly implemented?
      
      3. Relevance (0-10):
         - Query optimization: Is the SQL query optimized for performance?
         - Index usage: Are appropriate indexes defined or utilized?
         - Join techniques: Are the most efficient join methods used?
         - Advanced features: Is appropriate use made of views, stored procedures, etc.?
      
      Key concepts to check for understanding:
      - Relational database design
      - SQL query construction (SELECT, JOIN, GROUP BY, etc.)
      - Indexing and query optimization
      - Normalization forms (1NF, 2NF, 3NF, BCNF)
      - Transaction properties (ACID)
      - Entity-relationship modeling
      - Database security principles
      - NoSQL concepts where applicable
      
      Common misconceptions to identify:
      - Inefficient query patterns (e.g., SELECT * when unnecessary)
      - Denormalization without purpose
      - Missing join conditions
      - Improper use of aggregation functions
      - Lack of transaction boundaries
    `;
  } else if (normalizedSubject.includes("web") || normalizedSubject.includes("javascript") || normalizedSubject.includes("frontend")) {
    return `
      For Web Development questions, evaluate based on:
      
      1. Correctness (0-10):
         - Functionality: Does the solution work as expected?
         - Standards compliance: Does it follow web standards (HTML5, CSS3, ES6+)?
         - Framework usage: Are framework patterns correctly implemented?
         - Responsiveness: Does it handle different screen sizes?
      
      2. Completeness (0-10):
         - Feature implementation: Are all required features implemented?
         - Cross-browser compatibility: Will it work across browsers?
         - Error handling: Are network and user errors handled gracefully?
         - Performance considerations: Is loading and interaction optimized?
      
      3. Relevance (0-10):
         - Best practices: Does the code follow modern web development practices?
         - Component design: Are components modular and reusable?
         - State management: Is application state handled appropriately?
         - Security awareness: Are common vulnerabilities addressed?
      
      Key concepts to check for understanding:
      - DOM manipulation
      - Asynchronous programming (Promises, async/await)
      - Component-based architecture
      - State management patterns
      - API integration
      - Client-side routing
      - Responsive design principles
      - Web security fundamentals
      
      Common misconceptions to identify:
      - Callback hell without proper async handling
      - Direct DOM manipulation in component frameworks
      - Inefficient rendering patterns
      - Security vulnerabilities (XSS, CSRF)
      - Poor state management practices
    `;
  } else if (normalizedSubject.includes("machine learning") || normalizedSubject.includes("artificial intelligence") || normalizedSubject.includes("data science")) {
    return `
      For Machine Learning and AI questions, evaluate based on:
      
      1. Correctness (0-10):
         - Mathematical accuracy: Are the mathematical foundations correct?
         - Algorithm implementation: Is the ML algorithm properly implemented?
         - Model evaluation: Are evaluation metrics appropriately selected and calculated?
         - Data handling: Is data preprocessing correctly handled?
      
      2. Completeness (0-10):
         - Problem framing: Is the problem correctly framed as an ML task?
         - Feature engineering: Are appropriate features selected/created?
         - Model selection: Is the most suitable model chosen for the problem?
         - Validation approach: Is cross-validation or appropriate testing used?
      
      3. Relevance (0-10):
         - Model tuning: Are hyperparameters appropriately selected?
         - Overfitting prevention: Are regularization techniques applied when needed?
         - Interpretability: Is model interpretation considered?
         - Deployment considerations: Are production concerns addressed?
      
      Key concepts to check for understanding:
      - Supervised vs. unsupervised learning
      - Classification vs. regression
      - Model evaluation metrics
      - Feature selection and engineering
      - Cross-validation techniques
      - Bias-variance tradeoff
      - Regularization methods
      - Neural network fundamentals
      
      Common misconceptions to identify:
      - Training/test data leakage
      - Inappropriate evaluation metrics
      - Ignoring feature scaling
      - Overfitting without recognition
      - Misinterpreting model outputs
    `;
  } else if (normalizedSubject.includes("operating system") || normalizedSubject.includes("os")) {
    return `
      For Operating Systems questions, evaluate based on:
      
      1. Correctness (0-10):
         - Conceptual accuracy: Are OS concepts correctly explained?
         - Implementation details: Are implementation mechanisms accurately described?
         - Process management: Are process/thread concepts properly understood?
         - Memory management: Are memory allocation strategies correctly applied?
      
      2. Completeness (0-10):
         - Coverage of key components: Are all relevant OS components addressed?
         - Synchronization handling: Are race conditions and deadlocks considered?
         - Resource management: Are CPU, memory, and I/O resources properly managed?
         - Security considerations: Are protection mechanisms addressed?
      
      3. Relevance (0-10):
         - Design principles: Are OS design principles correctly applied?
         - Algorithm selection: Are appropriate scheduling/paging algorithms chosen?
         - System calls: Is the interaction between user and kernel space properly handled?
         - Performance considerations: Are efficiency tradeoffs recognized?
      
      Key concepts to check for understanding:
      - Process/thread management
      - CPU scheduling algorithms
      - Memory management (paging, segmentation)
      - Virtual memory
      - File systems
      - I/O systems
      - Synchronization mechanisms
      - Deadlock prevention and handling
      
      Common misconceptions to identify:
      - Confusion between processes and threads
      - Misunderstanding of virtual memory
      - Incorrect synchronization primitives
      - Overlooking context switching costs
      - File system implementation errors
    `;
  } else {
    return `
      For Object-Oriented Programming with C++ questions, evaluate based on:
      
      1. Correctness (0-10):
         - Syntax accuracy: Is the C++ code syntactically correct?
         - Logic validity: Does the solution work as intended?
         - OOP principles: Are the appropriate OOP concepts correctly applied?
         - Memory management: Is memory properly allocated and deallocated?
      
      2. Completeness (0-10):
         - Implementation thoroughness: Are all requirements addressed?
         - Edge case handling: Are boundary conditions considered?
         - Error handling: Is there proper exception handling?
         - Documentation: Are classes, methods, and logic sufficiently documented?
      
      3. Relevance (0-10):
         - Solution approach: Is the most appropriate OOP approach used?
         - Efficiency: Is the implementation efficient in terms of time and space complexity?
         - Style and standards: Does the code follow C++ best practices?
         - Design patterns: Are appropriate design patterns utilized when beneficial?
      
      Key concepts to check for understanding:
      - Classes, objects, and instances
      - Encapsulation and information hiding
      - Inheritance and code reuse
      - Polymorphism (compile-time and runtime)
      - Abstract classes and interfaces
      - Virtual functions and method overriding
      - Constructors, destructors, and memory management
      - Operator overloading
      - Templates and generic programming
      - Exception handling
      - STL usage and understanding
      
      Common misconceptions to identify:
      - Confusion between inheritance and composition
      - Misunderstanding of virtual functions and polymorphism
      - Improper memory management leading to leaks
      - Incorrect overriding vs. overloading
      - Inefficient use of STL containers
      - Poor encapsulation practices
    `;
  }
}
async function gradeStudentAnswer(question, correctAnswer, studentAnswer, subject = "Object-Oriented Programming with C++") {
  try {
    const gradingCriteria = getSubjectSpecificGradingCriteria(subject);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert educational assessment AI for university-level ${subject || "Object-Oriented Programming with C++"}. 
          You'll be grading a student's answer to a question with the following specific criteria:
          
          ${gradingCriteria}
          
          Provide a score from 0-100, detailed feedback, and analysis in JSON format.`
        },
        {
          role: "user",
          content: `
          QUESTION: ${question}
          CORRECT ANSWER: ${correctAnswer}
          STUDENT ANSWER: ${studentAnswer}
          
          Analyze the student's answer and provide a JSON response with:
          1. "score": A score from 0-100
          2. "feedback": Constructive feedback explaining the score with specific suggestions for improvement
          3. "analysis": Detailed analysis containing:
             - "correctness": Technical accuracy score (0-10)
             - "completeness": Concept coverage score (0-10)
             - "relevance": Focus on question score (0-10)
             - "keypoints": Array of key points correctly covered
             - "missingConcepts": Array of important concepts that were missed or underdeveloped
             - "misconceptions": Array of any detected misconceptions or errors
          `
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      // Lower temperature for more consistent grading
      max_tokens: 1e3
    });
    const contentStr = response.choices[0].message.content || "{}";
    const result = JSON.parse(contentStr);
    return {
      score: Math.round(result.score),
      feedback: result.feedback,
      analysis: {
        correctness: result.analysis.correctness,
        completeness: result.analysis.completeness,
        relevance: result.analysis.relevance,
        keypoints: result.analysis.keypoints || [],
        missingConcepts: result.analysis.missingConcepts || [],
        misconceptions: result.analysis.misconceptions || []
      }
    };
  } catch (error) {
    console.error("Error in AI grading:", error);
    return {
      score: 0,
      feedback: "Error processing your answer. Please try again later.",
      analysis: {
        correctness: 0,
        completeness: 0,
        relevance: 0,
        keypoints: [],
        missingConcepts: ["Could not analyze due to technical error"],
        misconceptions: []
      }
    };
  }
}
async function generatePerformanceInsights(studentData, subject = "Object-Oriented Programming with C++") {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert C++ programming instructor and educational analyst specializing in OOP. 
          Analyze student performance data on C++ programming assignments and provide detailed, actionable insights
          focused on improving their object-oriented programming skills.`
        },
        {
          role: "user",
          content: `
          Analyze the following student performance data for Object-Oriented Programming with C++:
          ${JSON.stringify(studentData)}
          
          Provide insights in JSON format with these specific C++ OOP-focused categories:
          1. "learningGaps": Array of specific C++ OOP concepts the student is struggling with
          2. "strengths": Array of C++ OOP concepts the student demonstrates mastery of
          3. "recommendedFocus": Array of specific C++ OOP topics and exercises to practice
          4. "teachingStrategies": Array of effective teaching approaches for addressing the identified gaps
          
          For each category, focus on:
          - Specific C++ language features (classes, templates, virtual functions, etc.)
          - Code organization principles (encapsulation, modularity)
          - Memory management patterns (RAII, smart pointers)
          - Design pattern understanding
          - Abstraction and inheritance implementation
          - Problem-solving approaches in an OOP context
          `
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      // Lower temperature for more consistent analysis
      max_tokens: 1500
    });
    const contentStr = response.choices[0].message.content || "{}";
    const result = JSON.parse(contentStr);
    return {
      learningGaps: result.learningGaps || [],
      strengths: result.strengths || [],
      recommendedFocus: result.recommendedFocus || [],
      teachingStrategies: result.teachingStrategies || []
    };
  } catch (error) {
    console.error("Error generating performance insights:", error);
    return {
      learningGaps: ["Unable to analyze learning gaps due to technical error"],
      strengths: ["Unable to analyze strengths due to technical error"],
      recommendedFocus: ["Review core concepts and fundamentals"],
      teachingStrategies: ["Consider standard teaching approaches until analysis is available"]
    };
  }
}

// server/online-cpp-service.ts
import axios from "axios";
var JUDGE0_CONFIG = {
  baseURL: "https://judge0-ce.p.rapidapi.com",
  headers: {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY || "demo-key",
    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    "Content-Type": "application/json"
  }
};
var CPP_LANGUAGE_ID = 54;
async function executeWithJudge0(code, input = "") {
  try {
    const submissionResponse = await axios.post(
      `${JUDGE0_CONFIG.baseURL}/submissions`,
      {
        language_id: CPP_LANGUAGE_ID,
        source_code: code,
        stdin: input,
        cpu_time_limit: 5,
        memory_limit: 128e3,
        wall_time_limit: 10
      },
      { headers: JUDGE0_CONFIG.headers, timeout: 1e4 }
    );
    const token = submissionResponse.data.token;
    if (!token) {
      throw new Error("Failed to submit code");
    }
    let attempts = 0;
    const maxAttempts = 20;
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      const resultResponse = await axios.get(
        `${JUDGE0_CONFIG.baseURL}/submissions/${token}`,
        { headers: JUDGE0_CONFIG.headers, timeout: 5e3 }
      );
      const result = resultResponse.data;
      if (result.status.id <= 2) {
        attempts++;
        continue;
      }
      if (result.status.id === 3) {
        return {
          output: result.stdout || "",
          success: true,
          compilationTime: `${result.time || 0}s`,
          executionTime: `${result.time || 0}s`,
          service: "Judge0 API"
        };
      } else {
        const errorOutput = result.stderr || result.compile_output || result.message || "Unknown error";
        return {
          output: errorOutput,
          success: false,
          error: errorOutput,
          service: "Judge0 API"
        };
      }
    }
    throw new Error("Execution timeout");
  } catch (error) {
    console.error("Judge0 API error:", error.message);
    throw new Error(`Judge0 API failed: ${error.message}`);
  }
}
async function executeWithWandbox(code, input = "") {
  try {
    const response = await axios.post(
      "https://wandbox.org/api/compile.json",
      {
        compiler: "gcc-head",
        code,
        stdin: input,
        options: "warning,gnu++17",
        "compiler-option-raw": "-std=gnu++17\n-O2\n-Wall\n-Wextra",
        runtime_option_raw: ""
      },
      { timeout: 15e3 }
    );
    const result = response.data;
    if (result.status === "0") {
      return {
        output: result.program_output || "",
        success: true,
        compilationTime: "0.8s",
        executionTime: "0.2s",
        service: "Wandbox API"
      };
    } else {
      const errorOutput = result.compiler_error || result.program_error || "Unknown error";
      return {
        output: errorOutput,
        success: false,
        error: errorOutput,
        service: "Wandbox API"
      };
    }
  } catch (error) {
    console.error("Wandbox API error:", error.message);
    throw new Error(`Wandbox API failed: ${error.message}`);
  }
}
async function executeWithCodeX(code, input = "") {
  try {
    const response = await axios.post(
      "https://api.codex.jaagrav.in",
      {
        language: "cpp",
        code,
        input
      },
      { timeout: 15e3 }
    );
    const result = response.data;
    if (result.error === "") {
      return {
        output: result.output || "",
        success: true,
        compilationTime: result.cpuTime || "0.5s",
        executionTime: result.cpuTime || "0.1s",
        service: "CodeX API"
      };
    } else {
      return {
        output: result.error,
        success: false,
        error: result.error,
        service: "CodeX API"
      };
    }
  } catch (error) {
    console.error("CodeX API error:", error.message);
    throw new Error(`CodeX API failed: ${error.message}`);
  }
}
async function executeWithOneCompiler(code, input = "") {
  try {
    const response = await axios.post(
      "https://onecompiler.com/api/code/exec",
      {
        language: "cpp",
        stdin: input,
        files: [{
          name: "main.cpp",
          content: code
        }]
      },
      {
        timeout: 15e3,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    const result = response.data;
    if (result.stdout || result.exception === null && result.stderr === "") {
      return {
        output: result.stdout || "",
        success: true,
        compilationTime: "0.6s",
        executionTime: "0.2s",
        service: "OneCompiler API"
      };
    } else {
      const errorOutput = result.stderr || result.exception || "Unknown error";
      return {
        output: errorOutput,
        success: false,
        error: errorOutput,
        service: "OneCompiler API"
      };
    }
  } catch (error) {
    console.error("OneCompiler API error:", error.message);
    throw new Error(`OneCompiler API failed: ${error.message}`);
  }
}
async function executeCppCodeOnline(code, input = "") {
  if (!code || typeof code !== "string") {
    return {
      output: "Error: No code provided",
      success: false,
      error: "No code provided"
    };
  }
  if (!code.includes("main")) {
    return {
      output: "Warning: No main function found. Your program should have a main() function.",
      success: false,
      error: "No main function found"
    };
  }
  const services = [
    { name: "Judge0", executor: executeWithJudge0 },
    { name: "Wandbox", executor: executeWithWandbox },
    { name: "CodeX", executor: executeWithCodeX },
    { name: "OneCompiler", executor: executeWithOneCompiler }
  ];
  let lastError = "";
  for (const service of services) {
    try {
      console.log(`Trying ${service.name} API...`);
      const result = await service.executor(code, input);
      if (result.success || result.output) {
        console.log(`\u2713 ${service.name} API succeeded`);
        return result;
      }
    } catch (error) {
      lastError = error.message;
      console.log(`\u2717 ${service.name} API failed:`, error.message);
      continue;
    }
  }
  return {
    output: `All compilation services are currently unavailable. Last error: ${lastError}`,
    success: false,
    error: `All services failed: ${lastError}`,
    service: "None available"
  };
}
async function formatCppCode(code) {
  try {
    let formatted = code.split("\n").map((line) => line.trim()).join("\n").replace(/\{/g, " {\n").replace(/\}/g, "\n}\n").replace(/;/g, ";\n").replace(/\n\s*\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/#include</g, "#include <").replace(/using namespace std;/g, "using namespace std;\n").split("\n").map((line, i, arr) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      let indent = 0;
      for (let j = 0; j < i; j++) {
        const prevLine = arr[j].trim();
        if (prevLine.endsWith("{")) indent++;
        if (prevLine === "}") indent--;
      }
      if (trimmed === "}") indent--;
      if (trimmed.startsWith("case ") || trimmed.startsWith("default:")) indent++;
      return "    ".repeat(Math.max(0, indent)) + trimmed;
    }).join("\n").trim();
    return {
      success: true,
      formattedCode: formatted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
async function analyzeCppCode(code) {
  try {
    const issues = [];
    const suggestions = [];
    if (!code.includes("#include")) {
      issues.push("\u26A0\uFE0F No #include statements found");
      suggestions.push("\u{1F4A1} Add necessary includes like #include <iostream>");
    }
    if (!code.includes("main")) {
      issues.push("\u274C No main function found");
      suggestions.push("\u{1F4A1} Every C++ program needs a main() function");
    }
    if (code.includes("cout") && !code.includes("#include <iostream>")) {
      issues.push("\u26A0\uFE0F Using cout without including <iostream>");
      suggestions.push("\u{1F4A1} Add #include <iostream> for input/output");
    }
    if (code.includes("vector") && !code.includes("#include <vector>")) {
      issues.push("\u26A0\uFE0F Using vector without including <vector>");
      suggestions.push("\u{1F4A1} Add #include <vector> for vector container");
    }
    if (!code.includes("using namespace std") && (code.includes("cout") || code.includes("cin"))) {
      suggestions.push('\u{1F4A1} Consider using "using namespace std;" or use std::cout, std::cin');
    }
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push("\u274C Unbalanced braces { }");
      suggestions.push("\u{1F4A1} Check that every { has a matching }");
    }
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push("\u274C Unbalanced parentheses ( )");
      suggestions.push("\u{1F4A1} Check that every ( has a matching )");
    }
    if (code.includes("main()") && !code.includes("return 0")) {
      suggestions.push('\u{1F4A1} Consider adding "return 0;" at the end of main()');
    }
    if (code.includes("endl") && code.match(/endl/g).length > 3) {
      suggestions.push('\u{1F4A1} For better performance, consider using "\\n" instead of endl for simple newlines');
    }
    let analysis = "\u{1F4CA} Code Analysis Report\n\n";
    if (issues.length === 0) {
      analysis += "\u2705 No major issues found!\n\n";
    } else {
      analysis += "\u{1F50D} Issues Found:\n";
      issues.forEach((issue) => analysis += `  ${issue}
`);
      analysis += "\n";
    }
    if (suggestions.length > 0) {
      analysis += "\u{1F4A1} Suggestions for Improvement:\n";
      suggestions.forEach((suggestion) => analysis += `  ${suggestion}
`);
    } else {
      analysis += "\u{1F389} Your code looks good! No additional suggestions.";
    }
    return {
      success: true,
      analysis
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// server/routes.ts
function ensureAuthenticated(req, res, next) {
  if (req.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
function ensureTeacher(req, res, next) {
  if (req.user && req.user.role === "teacher") {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Teacher access required" });
}
function ensureStudent(req, res, next) {
  if (req.user && req.user.role === "student") {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Student access required" });
}
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.use("/api/questions", authenticateToken);
  app2.use("/api/quizzes", authenticateToken);
  app2.use("/api/classes", authenticateToken);
  app2.use("/api/students", authenticateToken);
  app2.use("/api/notifications", authenticateToken);
  app2.use("/api/practice-quiz", authenticateToken);
  app2.use("/api/user", authenticateToken);
  app2.use("/api/student-quizzes", authenticateToken);
  app2.get("/api/students/search", ensureTeacher, async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }
      const student = await storage.getUserByEmail(email);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      if (student.role !== "student") {
        return res.status(400).json({ message: "User is not a student" });
      }
      const { password, ...studentData } = student;
      res.json(studentData);
    } catch (error) {
      console.error("Error searching for student:", error);
      res.status(500).json({ message: "Failed to search for student" });
    }
  });
  app2.post("/api/classes/invite", ensureTeacher, async (req, res) => {
    try {
      const { classId, studentId, studentEmail } = req.body;
      const teacherId = req.user.id;
      const classData = await storage.getClass(classId);
      if (!classData || classData.teacherId !== teacherId) {
        return res.status(403).json({ message: "Access denied to this class" });
      }
      await storage.createNotification({
        userId: studentId,
        title: "Class Invitation",
        message: `You have been invited to join the class "${classData.name}" (${classData.subject}). Click to accept or decline.`,
        type: "class_invitation",
        relatedId: classId
      });
      res.status(201).json({ message: "Invitation sent successfully" });
    } catch (error) {
      console.error("Error sending class invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });
  app2.post("/api/classes/accept-invitation", ensureStudent, async (req, res) => {
    try {
      const { classId, notificationId } = req.body;
      const studentId = req.user.id;
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      const success = await storage.addStudentToClass(classId, studentId);
      if (success) {
        if (notificationId) {
          await storage.markNotificationAsRead(notificationId);
        }
        res.status(201).json({ message: "Successfully joined the class" });
      } else {
        res.status(400).json({ message: "Failed to join class" });
      }
    } catch (error) {
      console.error("Error accepting class invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });
  app2.post("/api/classes/decline-invitation", ensureStudent, async (req, res) => {
    try {
      const { notificationId } = req.body;
      if (notificationId) {
        await storage.markNotificationAsRead(notificationId);
      }
      res.json({ message: "Invitation declined" });
    } catch (error) {
      console.error("Error declining class invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
    }
  });
  app2.patch("/api/user/profile", authenticateToken, ensureAuthenticated, async (req, res) => {
    try {
      const { firstName, lastName, email, phone } = req.body;
      const updated = await storage.updateUserProfile(req.user.id, { firstName, lastName, email });
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  app2.post("/api/user/password", authenticateToken, ensureAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      const user = req.user;
      const isValid = await (await import("bcryptjs")).default.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      const bcrypt2 = (await import("bcryptjs")).default;
      const hash = await bcrypt2.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hash);
      res.json({ success: true });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });
  app2.get("/api/classes/teacher", ensureTeacher, async (req, res) => {
    try {
      const teacherId = req.user.id;
      const classes2 = await storage.getClassesByTeacher(teacherId);
      const classesWithStudents = await Promise.all(classes2.map(async (classItem) => {
        const students = await storage.getClassStudents(classItem.id);
        return {
          ...classItem,
          studentCount: students.length,
          students
          // Include the actual student data
        };
      }));
      res.json(classesWithStudents);
    } catch (error) {
      console.error("Error getting teacher classes:", error);
      res.status(500).json({ message: "Error retrieving classes" });
    }
  });
  app2.get("/api/classes/student", ensureStudent, async (req, res) => {
    try {
      const studentId = req.user.id;
      const allClasses = await storage.getClassesByStudent(studentId);
      if (!allClasses || allClasses.length === 0) {
        return res.json([]);
      }
      res.json(allClasses);
    } catch (error) {
      console.error("Error getting student classes:", error);
      res.status(500).json({ message: "Error retrieving enrolled classes" });
    }
  });
  app2.get("/api/classes", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      if (userRole === "teacher") {
        const classes2 = await storage.getClassesByTeacher(userId);
        const classesWithStudents = await Promise.all(classes2.map(async (classItem) => {
          const students = await storage.getClassStudents(classItem.id);
          return {
            ...classItem,
            studentCount: students.length,
            students
          };
        }));
        res.json(classesWithStudents);
      } else {
        const studentClasses = await storage.getClassesByStudent(userId);
        res.json(studentClasses);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });
  app2.get("/api/classes/:id", async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }
      const classRecord = await storage.getClass(classId);
      if (!classRecord) {
        return res.status(404).json({ message: "Class not found" });
      }
      res.json(classRecord);
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });
  app2.get("/api/classes/:id/students", async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }
      const students = await storage.getStudentsByClass(classId);
      res.json(students);
    } catch (error) {
      console.error("Error fetching class students:", error);
      res.status(500).json({ message: "Failed to fetch class students" });
    }
  });
  app2.get("/api/classes/:id/quizzes", async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }
      const quizzes2 = await storage.getQuizzesByClass(classId);
      res.json(quizzes2);
    } catch (error) {
      console.error("Error fetching class quizzes:", error);
      res.status(500).json({ message: "Failed to fetch class quizzes" });
    }
  });
  app2.get("/api/classes/:id/performance", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }
      const performance = await storage.getStudentPerformanceByClass(classId);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching class performance:", error);
      res.status(500).json({ message: "Failed to fetch class performance" });
    }
  });
  app2.delete("/api/classes/:id/students/:studentId", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const studentId = parseInt(req.params.studentId);
      if (isNaN(classId) || isNaN(studentId)) {
        return res.status(400).json({ message: "Invalid class or student ID" });
      }
      await storage.removeStudentFromClass(classId, studentId);
      res.json({ message: "Student removed from class successfully" });
    } catch (error) {
      console.error("Error removing student from class:", error);
      res.status(500).json({ message: "Failed to remove student from class" });
    }
  });
  app2.get("/api/questions", ensureTeacher, async (req, res) => {
    try {
      const { subject, chapter, gradeLevel, type, difficulty, searchTerm } = req.query;
      const questions2 = await storage.searchQuestions({
        subject,
        chapter,
        gradeLevel,
        type,
        difficulty,
        searchTerm
      });
      res.json(questions2);
    } catch (error) {
      console.error("Error getting questions:", error);
      res.status(500).json({ message: "Error retrieving questions" });
    }
  });
  app2.get("/api/questions/chapters", ensureTeacher, async (_req, res) => {
    try {
      const chapters = await storage.getChapterOptions();
      res.json(chapters);
    } catch (error) {
      console.error("Error getting chapter options:", error);
      res.status(500).json({ message: "Error retrieving chapters" });
    }
  });
  app2.post("/api/questions", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "Question creation is disabled. Question bank is read-only." });
  });
  app2.put("/api/questions/:id", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "Question editing is disabled. Question bank is read-only." });
  });
  app2.delete("/api/questions/:id", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "Question deletion is disabled. Question bank is read-only." });
  });
  app2.post("/api/ai/generate-candidates", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "AI question generation is disabled. Question bank is read-only." });
  });
  app2.post("/api/ai/save-selected", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "AI question saving is disabled. Question bank is read-only." });
  });
  app2.post("/api/questions/generate", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "AI question generation is disabled. Question bank is read-only." });
  });
  const similarityThreshold = 0.8;
  function normalizeText(text2) {
    return text2.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
  }
  function computeSimpleWordOverlap(text1, text2) {
    const words1 = new Set(normalizeText(text1).split(" "));
    const words2 = new Set(normalizeText(text2).split(" "));
    if (words1.size === 0 || words2.size === 0) return 0;
    let commonCount = 0;
    Array.from(words1).forEach((word) => {
      if (words2.has(word)) commonCount++;
    });
    return commonCount / (words1.size + words2.size - commonCount);
  }
  function detectKeyPhrases(text2) {
    const normalized = normalizeText(text2);
    const phrases = [
      "class",
      "object",
      "inheritance",
      "polymorphism",
      "encapsulation",
      "abstraction",
      "constructor",
      "destructor",
      "virtual",
      "override",
      "template",
      "exception",
      "operator overload",
      "overriding",
      "overloading",
      "interface",
      "multiple inheritance",
      "abstract class",
      "friend function",
      "static member",
      "dynamic binding"
    ];
    return phrases.filter((phrase) => normalized.includes(phrase));
  }
  function hasSimilarContent(existingQuestion, newQuestion) {
    const existingContent = existingQuestion.content;
    const newContent = newQuestion.question;
    const exactMatch = normalizeText(existingContent) === normalizeText(newContent);
    if (exactMatch) return true;
    const overlapScore = computeSimpleWordOverlap(existingContent, newContent);
    if (overlapScore > similarityThreshold) return true;
    const existingPhrases = detectKeyPhrases(existingContent);
    const newPhrases = detectKeyPhrases(newContent);
    if (existingPhrases.length > 0 && newPhrases.length > 0 && existingPhrases.every((p) => newPhrases.includes(p)) && existingQuestion.type === newQuestion.type) {
      return true;
    }
    return false;
  }
  app2.post("/api/ai/save-questions", ensureTeacher, async (req, res) => {
    try {
      const { questions: questions2 } = req.body;
      if (!questions2 || !Array.isArray(questions2) || questions2.length === 0) {
        return res.status(400).json({ message: "No questions provided" });
      }
      const existingQuestions = await storage.getQuestionsByTeacher(1);
      const savedQuestions = [];
      const duplicates = [];
      const uniqueSelectedQuestions = [];
      const internalDuplicates = /* @__PURE__ */ new Set();
      for (let i = 0; i < questions2.length; i++) {
        let isDuplicateWithinSelection = false;
        for (let j = 0; j < uniqueSelectedQuestions.length; j++) {
          if (hasSimilarContent(
            { content: uniqueSelectedQuestions[j].question, type: uniqueSelectedQuestions[j].type },
            { question: questions2[i].question, type: questions2[i].type }
          )) {
            isDuplicateWithinSelection = true;
            break;
          }
        }
        if (!isDuplicateWithinSelection) {
          uniqueSelectedQuestions.push(questions2[i]);
        } else {
          internalDuplicates.add(i);
          duplicates.push(questions2[i].question);
        }
      }
      for (const questionData of uniqueSelectedQuestions) {
        try {
          const isDuplicate = existingQuestions.some(
            (q) => hasSimilarContent(q, questionData)
          );
          if (isDuplicate) {
            duplicates.push(questionData.question);
            continue;
          }
          const question = await storage.createQuestion({
            subject: questionData.subject,
            gradeLevel: questionData.gradeLevel,
            type: questionData.type,
            difficulty: questionData.difficulty,
            content: questionData.question,
            answer: questionData.correctAnswer,
            teacherId: 1
          });
          savedQuestions.push(question);
        } catch (err) {
          console.error("Error saving generated question:", err);
        }
      }
      let message = `${savedQuestions.length} questions have been saved to your question bank.`;
      if (duplicates.length > 0) {
        message += ` ${duplicates.length} duplicate question(s) were skipped.`;
      }
      res.json({
        questions: savedQuestions,
        duplicates: duplicates.length,
        message
      });
    } catch (error) {
      console.error("Error saving selected questions:", error);
      res.status(500).json({
        message: error.message || "Error saving selected questions"
      });
    }
  });
  app2.get("/api/quizzes", ensureAuthenticated, async (req, res) => {
    try {
      const now = /* @__PURE__ */ new Date();
      let list = [];
      if (req.user.role === "teacher") {
        const quizzes2 = await storage.getQuizzesByTeacher(req.user.id);
        list = quizzes2.map((q) => {
          if (q.scheduledAt && !["completed", "cancelled"].includes(q.status)) {
            const startMs = new Date(q.scheduledAt).getTime();
            const endMs = startMs + (q.duration ?? 0) * 6e4;
            const nowMs = now.getTime();
            if (!isNaN(startMs) && !isNaN(endMs)) {
              if (nowMs >= endMs) {
                return { ...q, status: "completed" };
              }
              if (nowMs >= startMs && nowMs < endMs) {
                return { ...q, status: "active" };
              }
            }
          }
          return q;
        });
      } else {
        const sQuizzes = await storage.getStudentQuizzesByStudent(req.user.id);
        const quizzes2 = await Promise.all(sQuizzes.map((sq) => storage.getQuiz(sq.quizId)));
        list = quizzes2.map((q, i) => {
          const sq = sQuizzes[i];
          if (!q) return null;
          let status = q.status;
          if (q.scheduledAt && !["completed", "cancelled"].includes(q.status)) {
            const startMs = new Date(q.scheduledAt).getTime();
            const endMs = startMs + (q.duration ?? 0) * 6e4;
            const nowMs = now.getTime();
            if (!isNaN(startMs) && !isNaN(endMs)) {
              if (nowMs >= endMs) status = "completed";
              else if (nowMs >= startMs && nowMs < endMs) status = "active";
            }
          }
          return {
            ...q,
            status,
            studentStatus: sq.status,
            studentQuizId: sq.id,
            quizId: q.id
          };
        }).filter(Boolean);
      }
      res.json(list);
    } catch (error) {
      console.error("Error getting quizzes:", error);
      res.status(500).json({ message: "Error retrieving quizzes" });
    }
  });
  app2.post("/api/quizzes", ensureTeacher, async (req, res) => {
    try {
      const selectedClass = await storage.getClass(req.body.classId);
      if (!selectedClass) {
        return res.status(400).json({ message: "Selected class not found" });
      }
      const quizData = insertQuizSchema.parse({
        title: req.body.title,
        classId: req.body.classId,
        subject: selectedClass.subject,
        gradeLevel: "University",
        // BSCS is university level
        duration: req.body.duration,
        scheduledAt: req.body.scheduledAt,
        teacherId: req.user.id,
        status: req.body.scheduledAt ? new Date(req.body.scheduledAt) <= /* @__PURE__ */ new Date() ? "active" : "scheduled" : "draft"
      });
      const quiz = await storage.createQuiz(quizData);
      if (req.body.questionIds && Array.isArray(req.body.questionIds)) {
        await Promise.all(req.body.questionIds.map(async (questionId, index) => {
          await storage.addQuestionToQuiz(quiz.id, questionId, index + 1);
        }));
      }
      if (req.body.classId) {
        const studentsInClass = await storage.getClassStudents(req.body.classId);
        await Promise.all(studentsInClass.map(async (student) => {
          await storage.assignQuizToStudent(quiz.id, student.id);
        }));
      }
      res.status(201).json(quiz);
    } catch (error) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating quiz:", error);
      res.status(500).json({ message: "Error creating quiz" });
    }
  });
  app2.get("/api/quizzes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      const questions2 = await storage.getQuizQuestions(quizId);
      res.json({
        quiz,
        questions: questions2
      });
    } catch (error) {
      console.error("Error getting quiz:", error);
      res.status(500).json({ message: "Error retrieving quiz" });
    }
  });
  app2.get("/api/quizzes/:id/questions", async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      console.log("Fetching questions for quiz ID:", quizId);
      const questions2 = await storage.getQuizQuestions(quizId);
      console.log("Found questions:", questions2.length);
      res.json(questions2);
    } catch (error) {
      console.error("Error getting quiz questions:", error);
      res.status(500).json({ message: "Error retrieving quiz questions" });
    }
  });
  app2.put("/api/quizzes/:id", ensureTeacher, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      const updateData = { ...req.body };
      if (updateData.scheduledAt && typeof updateData.scheduledAt === "string") {
        updateData.scheduledAt = new Date(updateData.scheduledAt);
      }
      if (updateData.status === "completed" && quiz.status !== "completed") {
        const updatedQuiz2 = await storage.updateQuiz(quizId, { status: "completed" });
        const sQuizzes = await storage.getStudentQuizzesByQuiz(quizId);
        for (const sq of sQuizzes) {
          if (sq.status !== "completed") {
            try {
              const answers = await storage.getStudentAnswersByQuiz(sq.id);
              const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
              const avg = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;
              await storage.updateStudentQuizStatus(sq.id, "completed", avg);
              await storage.logAttemptEvent(sq.id, "manual_submit", { reason: "quiz_ended_by_teacher" });
            } catch (e) {
              console.warn("Failed to complete attempt", sq.id, e);
            }
          }
        }
        return res.json(updatedQuiz2);
      }
      if (updateData.scheduledAt instanceof Date) {
        const now = /* @__PURE__ */ new Date();
        if (updateData.scheduledAt > now) updateData.status = "scheduled";
      } else if (updateData.scheduledAt === null || updateData.scheduledAt === void 0) {
        updateData.status = "draft";
      }
      const updatedQuiz = await storage.updateQuiz(quizId, updateData);
      if (Array.isArray(req.body.questionIds) && req.body.questionIds.length > 0) {
        await storage.updateQuizQuestions(quizId, req.body.questionIds);
      }
      res.json(updatedQuiz);
    } catch (error) {
      console.error("Error updating quiz:", error);
      res.status(500).json({ message: "Error updating quiz" });
    }
  });
  app2.delete("/api/quizzes/:id", ensureTeacher, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      await storage.deleteQuiz(quizId);
      res.json({ message: "Quiz deleted successfully" });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ message: "Error deleting quiz" });
    }
  });
  app2.get("/api/quizzes/:id/take", ensureAuthenticated, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      if (req.user.role === "student") {
        const studentQuizzes2 = await storage.getStudentQuizzesByStudent(req.user.id);
        const studentQuiz = studentQuizzes2.find((sq) => sq.quizId === quizId);
        if (!studentQuiz) {
          return res.status(403).json({ message: "You don't have access to this quiz" });
        }
      }
      const quizQuestions2 = await storage.getQuizQuestions(quizId);
      const types = {};
      for (const q of quizQuestions2) {
        types[q.type] = (types[q.type] || 0) + 1;
      }
      const summary = { totalQuestions: quizQuestions2.length, types };
      res.json({
        id: quiz.id,
        title: quiz.title,
        scheduledAt: quiz.scheduledAt,
        status: quiz.status,
        duration: quiz.duration,
        summary
      });
    } catch (error) {
      console.error("Error preparing quiz take page:", error);
      res.status(500).json({ message: "Error preparing quiz" });
    }
  });
  app2.post("/api/quizzes/:id/assign", ensureTeacher, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const studentIds = req.body.studentIds;
      if (!Array.isArray(studentIds)) {
        return res.status(400).json({ message: "studentIds must be an array" });
      }
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      const assignments = await Promise.all(studentIds.map(async (studentId) => {
        const assignmentData = insertStudentQuizSchema.parse({
          studentId,
          quizId,
          status: "assigned"
        });
        return storage.assignQuizToStudent(assignmentData);
      }));
      res.status(201).json(assignments);
    } catch (error) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error assigning quiz:", error);
      res.status(500).json({ message: "Error assigning quiz" });
    }
  });
  app2.post("/api/student-quizzes/:id/start", ensureStudent, async (req, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) {
        return res.status(404).json({ message: "Quiz assignment not found" });
      }
      if (studentQuiz.studentId !== req.user.id) {
        return res.status(403).json({ message: "You can only access your own quizzes" });
      }
      if (studentQuiz.status !== "assigned") {
        return res.status(400).json({ message: `Quiz is already ${studentQuiz.status}` });
      }
      const quizQuestions2 = await storage.getQuizQuestions(studentQuiz.quizId);
      const order = quizQuestions2.map((q) => q.id).sort(() => Math.random() - 0.5);
      const quiz = await storage.getQuiz(studentQuiz.quizId);
      if (quiz?.scheduledAt && new Date(quiz.scheduledAt).getTime() > Date.now()) {
        return res.status(400).json({ message: "Quiz has not started yet" });
      }
      const durationMinutes = quiz?.duration ?? 0;
      const endsAt = new Date(Date.now() + durationMinutes * 6e4);
      await storage.setAttemptPlan(studentQuizId, order, endsAt, true);
      const updatedStudentQuiz = await storage.updateStudentQuizStatus(studentQuizId, "in_progress");
      await storage.logAttemptEvent(studentQuizId, "attempt_start", { endsAt, questionCount: order.length });
      res.json({ ...updatedStudentQuiz, questionOrder: order, endsAt });
    } catch (error) {
      console.error("Error starting quiz:", error);
      res.status(500).json({ message: "Error starting quiz" });
    }
  });
  app2.post("/api/student-quizzes/:id/answers", ensureStudent, async (req, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const { questionId, answer, codeAnswer, codeOutput, codeError } = req.body;
      if (!questionId || typeof answer !== "string") {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });
      if (studentQuiz.studentId !== req.user.id) {
        return res.status(403).json({ message: "You can only submit answers for your own quiz" });
      }
      if (studentQuiz.status !== "in_progress") return res.status(400).json({ message: "Quiz is not in progress" });
      if (studentQuiz.endsAt && new Date(studentQuiz.endsAt).getTime() < Date.now()) {
        await storage.updateStudentQuizStatus(studentQuizId, "completed");
        return res.status(400).json({ message: "Attempt has ended" });
      }
      const studentAnswer = await storage.submitStudentAnswer({
        studentQuizId,
        questionId,
        answer,
        codeAnswer,
        codeOutput,
        codeError
      });
      await storage.logAttemptEvent(studentQuizId, "answer_submit", { questionId });
      res.status(201).json(studentAnswer);
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Error submitting answer" });
    }
  });
  const VIOLATION_TYPES = ["tab_blur", "visibility_hidden", "fullscreen_exit", "suspicious_face"];
  const VIOLATION_THRESHOLD = 3;
  const VIOLATION_WINDOW_MS = 2 * 6e4;
  async function completeAttemptAndScore(studentQuizId) {
    const answers = await storage.getStudentAnswersByQuiz(studentQuizId);
    const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
    const averageScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;
    return storage.updateStudentQuizStatus(studentQuizId, "completed", averageScore);
  }
  app2.post("/api/student-quizzes/:id/events", ensureStudent, async (req, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const { type, details } = req.body || {};
      if (!type || typeof type !== "string") {
        return res.status(400).json({ message: "Event 'type' is required" });
      }
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });
      if (studentQuiz.studentId !== req.user.id) {
        return res.status(403).json({ message: "You can only log events for your own quiz" });
      }
      if (studentQuiz.status !== "in_progress") {
        return res.status(400).json({ message: "Attempt is not in progress" });
      }
      if (studentQuiz.endsAt && new Date(studentQuiz.endsAt).getTime() <= Date.now()) {
        const updated = await completeAttemptAndScore(studentQuizId);
        await storage.logAttemptEvent(studentQuizId, "timeout_submit", { reason: "ends_at_passed" });
        return res.json({ completed: true, studentQuiz: updated });
      }
      const event = await storage.logAttemptEvent(studentQuizId, type, details);
      if (VIOLATION_TYPES.includes(type)) {
        const recentCount = await storage.countRecentViolationEvents(studentQuizId, VIOLATION_TYPES, VIOLATION_WINDOW_MS);
        if (recentCount >= VIOLATION_THRESHOLD) {
          const updated = await completeAttemptAndScore(studentQuizId);
          await storage.logAttemptEvent(studentQuizId, "violation_threshold", { threshold: VIOLATION_THRESHOLD, windowMs: VIOLATION_WINDOW_MS });
          return res.json({ logged: event, completed: true, studentQuiz: updated });
        }
      }
      res.status(201).json({ logged: event });
    } catch (error) {
      console.error("Error logging attempt event:", error);
      res.status(500).json({ message: "Error logging attempt event" });
    }
  });
  app2.get("/api/student-quizzes/:id/events", ensureAuthenticated, async (req, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });
      const user = req.user;
      if (user.role === "student" && studentQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You can only view your own quiz events" });
      }
      if (user.role === "teacher") {
        const quiz = await storage.getQuiz(studentQuiz.quizId);
        if (!quiz || quiz.teacherId !== user.id) {
          return res.status(403).json({ message: "You can only view events for your own quizzes" });
        }
      }
      const events = await storage.getAttemptEvents(studentQuizId, 500);
      res.json(events);
    } catch (error) {
      console.error("Error retrieving attempt events:", error);
      res.status(500).json({ message: "Error retrieving attempt events" });
    }
  });
  app2.get("/api/student-quizzes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });
      const user = req.user;
      if (user.role === "student" && studentQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You can only view your own quiz" });
      }
      if (user.role === "teacher") {
        const quiz2 = await storage.getQuiz(studentQuiz.quizId);
        if (!quiz2 || quiz2.teacherId !== user.id) {
          return res.status(403).json({ message: "You can only view attempts for your own quizzes" });
        }
      }
      const quiz = await storage.getQuiz(studentQuiz.quizId);
      res.json({ ...studentQuiz, quiz });
    } catch (error) {
      console.error("Error retrieving student quiz:", error);
      res.status(500).json({ message: "Error retrieving student quiz" });
    }
  });
  app2.get("/api/student-quizzes", ensureStudent, async (req, res) => {
    try {
      const studentId = req.user.id;
      const sQuizzes = await storage.getStudentQuizzesByStudent(studentId);
      const now = /* @__PURE__ */ new Date();
      const enriched = await Promise.all(
        sQuizzes.map(async (sq) => {
          const quiz = await storage.getQuiz(sq.quizId);
          if (!quiz) return null;
          let status = quiz.status;
          if (quiz.scheduledAt && new Date(quiz.scheduledAt) <= now && !["completed", "cancelled"].includes(quiz.status)) {
            status = "active";
          }
          return { ...sq, quiz: { ...quiz, status } };
        })
      );
      res.json(enriched.filter(Boolean));
    } catch (error) {
      console.error("Error getting student quizzes:", error);
      res.status(500).json({ message: "Error retrieving student quizzes" });
    }
  });
  app2.get("/api/student-quizzes/:id/answers", ensureAuthenticated, async (req, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) {
        return res.status(404).json({ message: "Quiz assignment not found" });
      }
      const user = req.user;
      if (user.role === "student" && studentQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You can only view your own answers" });
      }
      if (user.role === "teacher") {
        const quiz = await storage.getQuiz(studentQuiz.quizId);
        if (!quiz || quiz.teacherId !== user.id) {
          return res.status(403).json({ message: "You can only view answers for your own quizzes" });
        }
      }
      const answers = await storage.getStudentAnswersByQuiz(studentQuizId);
      res.json(answers);
    } catch (error) {
      console.error("Error getting student answers:", error);
      res.status(500).json({ message: "Error retrieving student answers" });
    }
  });
  app2.post("/api/student-quizzes/:id/complete", ensureStudent, async (req, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });
      if (studentQuiz.studentId !== req.user.id) {
        return res.status(403).json({ message: "You can only complete your own quiz" });
      }
      if (studentQuiz.status !== "in_progress") return res.status(400).json({ message: "Quiz is not in progress" });
      const { answers } = req.body;
      if (answers && Array.isArray(answers)) {
        for (const answer of answers) {
          if (answer.questionId && typeof answer.answer === "string") {
            await storage.submitStudentAnswer({
              studentQuizId,
              questionId: answer.questionId,
              answer: answer.answer,
              codeAnswer: answer.codeAnswer,
              codeOutput: answer.codeOutput,
              codeError: answer.codeError
            });
          }
        }
      }
      const updatedStudentQuiz = await storage.updateStudentQuizStatus(studentQuizId, "completed");
      await storage.logAttemptEvent(studentQuizId, "manual_submit");
      res.json(updatedStudentQuiz);
    } catch (error) {
      console.error("Error completing quiz:", error);
      res.status(500).json({ message: "Error completing quiz" });
    }
  });
  app2.get("/api/quizzes/:quizId/grading", ensureTeacher, async (req, res) => {
    try {
      const quizId = parseInt(req.params.quizId);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz || quiz.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const attempts = await storage.getAttemptsWithUsersByQuiz(quizId);
      const completedAttempts = attempts.filter((a) => a.status === "completed");
      res.json(completedAttempts);
    } catch (error) {
      console.error("Error getting grading data:", error);
      res.status(500).json({ message: "Error retrieving grading data" });
    }
  });
  app2.get("/api/student-quizzes/:studentQuizId/answers-with-questions", ensureTeacher, async (req, res) => {
    try {
      const studentQuizId = parseInt(req.params.studentQuizId);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Student quiz not found" });
      const quiz = await storage.getQuiz(studentQuiz.quizId);
      if (!quiz || quiz.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const answers = await storage.getStudentAnswersByQuiz(studentQuizId);
      const questions2 = await storage.getQuizQuestions(studentQuiz.quizId);
      const answersWithQuestions = answers.map((answer) => {
        const question = questions2.find((q) => q.id === answer.questionId);
        return {
          ...answer,
          question: question ? {
            id: question.id,
            content: question.content,
            type: question.type,
            answer: question.answer
            // Include correct answer for grading
          } : null
        };
      });
      res.json(answersWithQuestions);
    } catch (error) {
      console.error("Error getting student answers:", error);
      res.status(500).json({ message: "Error retrieving student answers" });
    }
  });
  app2.post("/api/student-quizzes/:studentQuizId/grade", ensureTeacher, async (req, res) => {
    try {
      const studentQuizId = parseInt(req.params.studentQuizId);
      const { questionId, score, feedback } = req.body;
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Student quiz not found" });
      const quiz = await storage.getQuiz(studentQuiz.quizId);
      if (!quiz || quiz.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updatedAnswer = await storage.updateStudentAnswerScore(studentQuizId, questionId, score, feedback);
      res.json(updatedAnswer);
    } catch (error) {
      console.error("Error grading answer:", error);
      res.status(500).json({ message: "Error grading answer" });
    }
  });
  app2.post("/api/quizzes/:quizId/post-results", ensureTeacher, async (req, res) => {
    try {
      const quizId = parseInt(req.params.quizId);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz || quiz.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const attempts = await storage.getStudentQuizzesByQuiz(quizId);
      const completedAttempts = attempts.filter((a) => a.status === "completed");
      for (const attempt of completedAttempts) {
        const answers = await storage.getStudentAnswersByQuiz(attempt.id);
        const totalScore = answers.reduce((sum, answer) => sum + (answer.score || 0), 0);
        const averageScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;
        await storage.updateStudentQuizStatus(attempt.id, "completed", averageScore);
        await storage.createNotification({
          userId: attempt.studentId,
          title: "Quiz Results Available",
          message: `Your results for "${quiz.title}" are now available. Your score: ${averageScore}%`,
          type: "quiz_result",
          relatedId: quizId
        });
      }
      res.json({ message: "Results posted successfully", updatedAttempts: completedAttempts.length });
    } catch (error) {
      console.error("Error posting results:", error);
      res.status(500).json({ message: "Error posting results" });
    }
  });
  app2.get("/api/students", ensureTeacher, async (req, res) => {
    try {
      const teacherId = req.user?.id || 5;
      const classes2 = await storage.getClassesByTeacher(teacherId);
      if (classes2.length === 0) {
        const allStudents2 = await storage.getUsersByRole("student");
        const sanitizedStudents = allStudents2.map((student) => {
          const { password, ...rest } = student;
          return rest;
        });
        return res.json(sanitizedStudents);
      }
      let allStudents = [];
      for (const cls of classes2) {
        const students = await storage.getClassStudents(cls.id);
        const studentsWithClass = students.map((student) => ({
          ...student,
          classes: [{ id: cls.id, name: cls.name }]
        }));
        studentsWithClass.forEach((newStudent) => {
          const existingIndex = allStudents.findIndex((s) => s.id === newStudent.id);
          if (existingIndex >= 0) {
            allStudents[existingIndex].classes.push(...newStudent.classes);
          } else {
            allStudents.push(newStudent);
          }
        });
      }
      return res.json(allStudents);
    } catch (error) {
      console.error("Error getting students:", error);
      res.status(500).json({ message: "Error retrieving students" });
    }
  });
  app2.post("/api/classes", ensureTeacher, async (req, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const existingClass = await storage.getClassByNameAndTeacher(req.body.name, teacherId);
      if (existingClass) {
        return res.status(409).json({
          message: "You already have a class with this name. Please choose a different name."
        });
      }
      const classData = insertClassSchema.parse({
        ...req.body,
        teacherId
      });
      const newClass = await storage.createClass(classData);
      res.status(201).json(newClass);
    } catch (error) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating class:", error);
      res.status(500).json({ message: "Error creating class" });
    }
  });
  app2.put("/api/classes/:id", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const existingClass = await storage.getClass(classId);
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ message: "You can only edit your own classes" });
      }
      if (req.body.name && req.body.name !== existingClass.name) {
        const duplicateClass = await storage.getClassByNameAndTeacher(req.body.name, teacherId);
        if (duplicateClass) {
          return res.status(409).json({
            message: "You already have a class with this name. Please choose a different name."
          });
        }
      }
      const classData = insertClassSchema.parse({
        ...req.body,
        teacherId
      });
      const updatedClass = await storage.updateClass(classId, classData);
      res.json(updatedClass);
    } catch (error) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating class:", error);
      res.status(500).json({ message: "Error updating class" });
    }
  });
  app2.delete("/api/classes/:id", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const existingClass = await storage.getClass(classId);
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ message: "You can only delete your own classes" });
      }
      await storage.deleteClass(classId);
      res.json({ message: "Class deleted successfully" });
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ message: "Error deleting class" });
    }
  });
  app2.post("/api/classes/:id/students", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { studentIds } = req.body;
      if (!Array.isArray(studentIds)) {
        return res.status(400).json({ message: "studentIds must be an array" });
      }
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      const results = await Promise.all(studentIds.map(async (studentId) => {
        return storage.addStudentToClass(classId, studentId);
      }));
      res.status(201).json(results);
    } catch (error) {
      console.error("Error adding students to class:", error);
      res.status(500).json({ message: "Error adding students to class" });
    }
  });
  app2.get("/api/classes/:id/students", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      const students = await storage.getClassStudents(classId);
      const sanitizedStudents = students.map((student) => {
        const { password, ...rest } = student;
        return rest;
      });
      res.json(sanitizedStudents);
    } catch (error) {
      console.error("Error getting class students:", error);
      res.status(500).json({ message: "Error retrieving class students" });
    }
  });
  app2.post("/api/practice-quiz/generate", ensureStudent, async (req, res) => {
    try {
      const user = { id: 4 };
      const { subject, chapter, questionCount = 5 } = req.body;
      if (!subject) {
        return res.status(400).json({ message: "Subject is required" });
      }
      const searchFilters = { subject };
      if (chapter) {
        searchFilters.chapter = chapter;
      }
      const allQuestions = await storage.searchQuestions(searchFilters);
      if (allQuestions.length === 0) {
        return res.status(404).json({
          message: `No questions found for subject: ${subject}. Please try another subject.`
        });
      }
      const selectedCount = Math.min(parseInt(questionCount.toString()), allQuestions.length);
      const shuffledQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
      const practiceQuestions = shuffledQuestions.slice(0, selectedCount);
      const practiceQuiz = await storage.createPracticeQuiz({
        studentId: user.id,
        subject,
        chapter,
        questionCount: selectedCount,
        status: "in_progress"
      });
      for (const question of practiceQuestions) {
        await storage.addQuestionToPracticeQuiz(practiceQuiz.id, question.id);
      }
      const userClasses = await storage.getClassesByStudent(user.id);
      if (userClasses.length > 0) {
        const processedStudentIds = /* @__PURE__ */ new Set();
        processedStudentIds.add(user.id);
        for (const classItem of userClasses) {
          const classStudents2 = await storage.getClassStudents(classItem.id);
          for (const student of classStudents2) {
            if (!processedStudentIds.has(student.id)) {
              processedStudentIds.add(student.id);
              await storage.createNotification({
                userId: student.id,
                title: "New Practice Quiz Available",
                message: `A new practice quiz on ${subject} is available for practice.`,
                type: "practice_quiz_available",
                relatedId: practiceQuiz.id
              });
            }
          }
        }
      }
      const questionsWithDetails = await storage.getPracticeQuizQuestions(practiceQuiz.id);
      res.json({
        practiceQuiz: {
          ...practiceQuiz,
          questions: questionsWithDetails
        },
        message: `Generated practice quiz with ${practiceQuestions.length} questions on ${subject}`
      });
    } catch (error) {
      console.error("Error generating practice quiz:", error);
      res.status(500).json({ message: "Error generating practice quiz" });
    }
  });
  app2.post("/api/practice-quiz/submit", ensureStudent, async (req, res) => {
    try {
      const user = { id: 4 };
      const { answers, practiceQuizId } = req.body;
      if (!answers || !Array.isArray(answers) || !practiceQuizId) {
        return res.status(400).json({ message: "Invalid submission data" });
      }
      const practiceQuiz = await storage.getPracticeQuiz(practiceQuizId);
      if (!practiceQuiz) {
        return res.status(404).json({ message: "Practice quiz not found" });
      }
      if (practiceQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to submit this quiz" });
      }
      const gradingResults = await Promise.all(
        answers.map(async (answerItem) => {
          const { questionId, answer } = answerItem;
          const question = await storage.getQuestion(questionId);
          if (!question) {
            return {
              questionId,
              score: 0,
              feedback: "Question not found",
              success: false
            };
          }
          try {
            const gradingResult = await gradeStudentAnswer(
              question.content,
              question.answer,
              answer,
              question.subject
            );
            const practiceQuizAnswer = await storage.submitPracticeQuizAnswer(
              practiceQuizId,
              questionId,
              answer,
              gradingResult.score,
              gradingResult.feedback,
              gradingResult.analysis
            );
            return {
              questionId,
              question: question.content,
              correctAnswer: question.answer,
              studentAnswer: answer,
              score: gradingResult.score,
              feedback: gradingResult.feedback,
              analysis: gradingResult.analysis,
              success: true
            };
          } catch (error) {
            console.error("Error grading practice answer:", error);
            return {
              questionId,
              question: question.content,
              correctAnswer: question.answer,
              studentAnswer: answer,
              score: 0,
              feedback: "Error grading answer",
              success: false
            };
          }
        })
      );
      const validScores = gradingResults.filter((r) => r.success).map((r) => r.score);
      const averageScore = validScores.length > 0 ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length) : 0;
      await storage.updatePracticeQuizStatus(practiceQuizId, "completed", averageScore);
      await storage.createNotification({
        userId: user.id,
        title: "Practice Quiz Results",
        message: `You completed a practice quiz in ${practiceQuiz.subject} with a score of ${averageScore}%.`,
        type: "practice_quiz_completed",
        relatedId: practiceQuizId
      });
      res.json({
        practiceQuizId,
        results: gradingResults,
        averageScore,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Error submitting practice quiz:", error);
      res.status(500).json({ message: "Error submitting practice quiz" });
    }
  });
  app2.get("/api/practice-quiz/subjects", ensureStudent, async (req, res) => {
    try {
      const user = { id: 1 };
      const mainSubjects = [
        "Object-Oriented Programming",
        "Data Structures",
        "Algorithms",
        "Databases",
        "Operating Systems"
      ];
      const allQuestions = await storage.searchQuestions({});
      const questionCounts = mainSubjects.map((subject) => ({
        subject,
        count: allQuestions.filter((q) => q.subject === subject).length
      }));
      res.json({
        subjects: mainSubjects,
        questionCounts
      });
    } catch (error) {
      console.error("Error getting practice quiz subjects:", error);
      res.status(500).json({ message: "Error retrieving practice quiz subjects" });
    }
  });
  app2.get("/api/practice-quiz/chapters", ensureStudent, async (req, res) => {
    try {
      const { subject } = req.query;
      if (!subject || typeof subject !== "string") {
        return res.status(400).json({ message: "Subject parameter is required" });
      }
      const subjectQuestions = await storage.searchQuestions({ subject });
      const chapterMap = /* @__PURE__ */ new Map();
      subjectQuestions.forEach((q) => {
        if (q.chapter && q.chapter.trim() !== "") {
          if (!chapterMap.has(q.chapter)) {
            chapterMap.set(q.chapter, {
              chapter: q.chapter,
              minId: q.id,
              count: 1
            });
          } else {
            const existing = chapterMap.get(q.chapter);
            existing.count++;
            if (q.id < existing.minId) {
              existing.minId = q.id;
            }
          }
        }
      });
      const chaptersWithOrder = Array.from(chapterMap.values()).sort((a, b) => a.minId - b.minId);
      const chapters = chaptersWithOrder.map((c) => c.chapter);
      const chapterCounts = chaptersWithOrder.map((c) => ({
        chapter: c.chapter,
        count: c.count
      }));
      res.json({
        subject,
        chapters,
        chapterCounts
      });
    } catch (error) {
      console.error("Error getting practice quiz chapters:", error);
      res.status(500).json({ message: "Error retrieving practice quiz chapters" });
    }
  });
  app2.get("/api/practice-quiz/history", ensureStudent, async (req, res) => {
    try {
      const user = { id: 1 };
      const practiceQuizzes2 = await storage.getPracticeQuizzesByStudent(user.id);
      res.json({
        practiceQuizzes: practiceQuizzes2
      });
    } catch (error) {
      console.error("Error getting practice quiz history:", error);
      res.status(500).json({ message: "Error retrieving practice quiz history" });
    }
  });
  app2.get("/api/practice-quiz/:id", ensureStudent, async (req, res) => {
    try {
      const user = { id: 1 };
      const practiceQuizId = parseInt(req.params.id);
      if (isNaN(practiceQuizId)) {
        return res.status(400).json({ message: "Invalid practice quiz ID" });
      }
      const practiceQuiz = await storage.getPracticeQuiz(practiceQuizId);
      if (!practiceQuiz) {
        return res.status(404).json({ message: "Practice quiz not found" });
      }
      if (practiceQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to view this quiz" });
      }
      const questions2 = await storage.getPracticeQuizQuestions(practiceQuizId);
      const answers = await storage.getPracticeQuizAnswers(practiceQuizId);
      res.json({
        practiceQuiz,
        questions: questions2,
        answers
      });
    } catch (error) {
      console.error("Error getting practice quiz details:", error);
      res.status(500).json({ message: "Error retrieving practice quiz details" });
    }
  });
  app2.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const notifications2 = await storage.getNotificationsByUser(userId);
      res.json({
        notifications: notifications2
      });
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Error retrieving notifications" });
    }
  });
  app2.post("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      if (!updatedNotification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({
        notification: updatedNotification
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Error updating notification" });
    }
  });
  app2.get("/api/analytics/performance", ensureTeacher, async (req, res) => {
    try {
      const teacherId = req.user?.id || 5;
      const classes2 = await storage.getClassesByTeacher(teacherId);
      const classStudents2 = [];
      for (const classItem of classes2) {
        const students = await storage.getClassStudents(classItem.id);
        classStudents2.push({
          class: classItem,
          students: students.map((s) => {
            const { password, ...rest } = s;
            return rest;
          })
        });
      }
      const quizzes2 = await storage.getQuizzesByTeacher(teacherId);
      const quizPerformance = [];
      for (const quiz of quizzes2) {
        const studentQuizzes2 = await storage.getStudentQuizzesByQuiz(quiz.id);
        quizPerformance.push({
          quiz,
          studentPerformance: studentQuizzes2
        });
      }
      res.json({
        teacherId,
        classCount: classes2.length,
        studentCount: classStudents2.reduce((sum, cs) => sum + cs.students.length, 0),
        quizCount: quizzes2.length,
        classStudents: classStudents2,
        quizPerformance
      });
    } catch (error) {
      console.error("Error getting performance analytics:", error);
      res.status(500).json({ message: "Error retrieving performance analytics" });
    }
  });
  app2.post("/api/analytics/insights", ensureTeacher, async (req, res) => {
    try {
      const { studentData, subject } = req.body;
      if (!studentData || !subject) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const insights = await generatePerformanceInsights(studentData, subject);
      res.json(insights);
    } catch (error) {
      console.error("Error generating performance insights:", error);
      res.status(500).json({ message: "Error generating performance insights" });
    }
  });
  app2.post("/api/execute-cpp", async (req, res) => {
    try {
      const { code, input } = req.body;
      const result = await executeCppCodeOnline(code, input);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        output: `Server Error: ${error.message}`
      });
    }
  });
  app2.post("/api/format-cpp", async (req, res) => {
    try {
      const { code } = req.body;
      const result = await formatCppCode(code);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.post("/api/analyze-cpp", async (req, res) => {
    try {
      const { code } = req.body;
      const result = await analyzeCppCode(code);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  app2.get("/api/quizzes/:quizId/attempts", ensureTeacher, async (req, res) => {
    try {
      const quizId = parseInt(req.params.quizId);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz || quiz.teacherId !== req.user.id) {
        return res.status(403).json({ message: "You can only view attempts for your own quizzes" });
      }
      const attempts = await storage.getAttemptsWithUsersByQuiz(quizId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching attempts:", error);
      res.status(500).json({ message: "Error fetching attempts" });
    }
  });
  const monitoringSessions = /* @__PURE__ */ new Map();
  const monitoringFrames = /* @__PURE__ */ new Map();
  const consentRequests = /* @__PURE__ */ new Map();
  const activeConsents = /* @__PURE__ */ new Map();
  const sseClients = /* @__PURE__ */ new Map();
  app2.post("/api/monitoring/frames", ensureStudent, async (req, res) => {
    try {
      const { quizId, studentId, dataUrl, timestamp: timestamp2 } = req.body;
      if (!quizId || !dataUrl || studentId !== req.user.id) {
        return res.status(400).json({ message: "Invalid frame data" });
      }
      const consentKey = `${quizId}:${studentId}`;
      const consent = activeConsents.get(consentKey);
      if (!consent?.approved) {
        return res.status(403).json({ message: "No monitoring consent" });
      }
      const frameKey = `${quizId}:${studentId}:${Date.now()}`;
      const frame = { studentId, quizId, dataUrl, timestamp: timestamp2 || Date.now() };
      monitoringFrames.set(frameKey, frame);
      const sessionKey = `${quizId}:${studentId}`;
      monitoringSessions.set(sessionKey, {
        studentId,
        quizId,
        status: "active",
        lastFrame: Date.now(),
        teacherId: consent.teacherId
      });
      const sseKey = `${quizId}:${consent.teacherId}:${studentId}`;
      const sseRes = sseClients.get(sseKey);
      if (sseRes) {
        try {
          sseRes.write(`data: ${JSON.stringify({
            id: frameKey,
            studentId,
            quizId,
            dataUrl,
            timestamp: frame.timestamp
          })}

`);
        } catch (error) {
          console.warn("Failed to send SSE frame:", error);
          sseClients.delete(sseKey);
        }
      }
      const studentFrameKeys = Array.from(monitoringFrames.keys()).filter((key) => key.startsWith(`${quizId}:${studentId}:`)).sort((a, b) => {
        const timestampA = parseInt(a.split(":")[2]);
        const timestampB = parseInt(b.split(":")[2]);
        return timestampB - timestampA;
      });
      studentFrameKeys.slice(10).forEach((key) => monitoringFrames.delete(key));
      res.json({ success: true, frameId: frameKey });
    } catch (error) {
      console.error("Error storing frame:", error);
      res.status(500).json({ message: "Error storing frame" });
    }
  });
  app2.post("/api/monitoring/request", ensureTeacher, async (req, res) => {
    try {
      const { quizId, studentId } = req.body;
      const teacherId = req.user.id;
      if (!quizId || !studentId) {
        return res.status(400).json({ message: "Missing quizId or studentId" });
      }
      const quiz = await storage.getQuiz(quizId);
      if (!quiz || quiz.teacherId !== teacherId) {
        return res.status(403).json({ message: "You can only monitor your own quizzes" });
      }
      const consentKey = `${quizId}:${studentId}`;
      consentRequests.set(consentKey, {
        teacherId,
        timestamp: Date.now()
      });
      res.json({ success: true, message: "Monitoring request sent to student" });
    } catch (error) {
      console.error("Error requesting monitoring:", error);
      res.status(500).json({ message: "Error requesting monitoring" });
    }
  });
  app2.post("/api/monitoring/consent", ensureStudent, async (req, res) => {
    try {
      const { quizId, studentId, teacherId, approved } = req.body;
      if (studentId !== req.user.id) {
        return res.status(403).json({ message: "You can only respond to your own consent requests" });
      }
      const consentKey = `${quizId}:${studentId}`;
      if (approved) {
        activeConsents.set(consentKey, {
          teacherId,
          approved: true,
          timestamp: Date.now()
        });
      } else {
        activeConsents.delete(consentKey);
      }
      consentRequests.delete(consentKey);
      res.json({ success: true, approved });
    } catch (error) {
      console.error("Error handling consent:", error);
      res.status(500).json({ message: "Error handling consent" });
    }
  });
  app2.get("/api/monitoring/consent-requests", ensureStudent, async (req, res) => {
    try {
      const { quizId, studentId } = req.query;
      const userId = req.user.id;
      if (parseInt(studentId) !== userId) {
        return res.status(403).json({ message: "You can only check your own consent requests" });
      }
      const consentKey = `${quizId}:${studentId}`;
      const request = consentRequests.get(consentKey);
      if (request && Date.now() - request.timestamp < 3e5) {
        res.json({
          hasRequest: true,
          teacherId: request.teacherId,
          timestamp: request.timestamp
        });
      } else {
        if (request) consentRequests.delete(consentKey);
        res.json({ hasRequest: false });
      }
    } catch (error) {
      console.error("Error checking consent requests:", error);
      res.status(500).json({ message: "Error checking consent requests" });
    }
  });
  app2.get("/api/monitoring/sessions", ensureTeacher, async (req, res) => {
    try {
      const { quizId } = req.query;
      const teacherId = req.user.id;
      if (!quizId) {
        return res.status(400).json({ message: "Missing quizId" });
      }
      const quiz = await storage.getQuiz(parseInt(quizId));
      if (!quiz || quiz.teacherId !== teacherId) {
        return res.status(403).json({ message: "You can only view sessions for your own quizzes" });
      }
      const sessions = Array.from(monitoringSessions.entries()).filter(([key, session]) => {
        return key.startsWith(`${quizId}:`) && session.teacherId === teacherId;
      }).map(([key, session]) => ({
        id: key,
        studentId: session.studentId,
        quizId: session.quizId,
        status: Date.now() - session.lastFrame > 3e4 ? "inactive" : session.status,
        lastFrameTime: session.lastFrame
      }));
      res.json(sessions);
    } catch (error) {
      console.error("Error getting monitoring sessions:", error);
      res.status(500).json({ message: "Error getting monitoring sessions" });
    }
  });
  app2.get("/api/monitoring/stream", ensureTeacher, (req, res) => {
    try {
      const { quizId, studentId } = req.query;
      const teacherId = req.user.id;
      if (!quizId || !studentId) {
        return res.status(400).json({ message: "Missing quizId or studentId" });
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control"
      });
      const sseKey = `${quizId}:${teacherId}:${studentId}`;
      sseClients.set(sseKey, res);
      res.write('data: {"type":"connected"}\n\n');
      const heartbeat = setInterval(() => {
        try {
          res.write('data: {"type":"heartbeat","timestamp":' + Date.now() + "}\n\n");
        } catch (error) {
          clearInterval(heartbeat);
          sseClients.delete(sseKey);
        }
      }, 3e4);
      req.on("close", () => {
        clearInterval(heartbeat);
        sseClients.delete(sseKey);
      });
    } catch (error) {
      console.error("Error setting up SSE stream:", error);
      res.status(500).json({ message: "Error setting up monitoring stream" });
    }
  });
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path3, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path2, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname, "client", "src"),
      "@shared": path2.resolve(__dirname, "shared")
    }
  },
  root: path2.resolve(__dirname, "client"),
  server: {
    // No proxy needed - frontend and backend run on same port in development
  },
  build: {
    outDir: path2.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import { createServer } from "http";

// server/migrate.ts
import { sql as sql2 } from "drizzle-orm";
async function createTables() {
  console.log("Creating database tables...");
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      answer TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS quizzes (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      duration INTEGER NOT NULL,
      scheduled_at TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.execute(sql2`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id);`);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      "order" INTEGER NOT NULL
    );
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS student_quizzes (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES users(id),
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
      score INTEGER,
      status TEXT NOT NULL DEFAULT 'assigned',
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    );
  `);
  await db.execute(sql2`ALTER TABLE student_quizzes ADD COLUMN IF NOT EXISTS question_order JSONB;`);
  await db.execute(sql2`ALTER TABLE student_quizzes ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP;`);
  await db.execute(sql2`ALTER TABLE student_quizzes ADD COLUMN IF NOT EXISTS enforce_fullscreen BOOLEAN NOT NULL DEFAULT TRUE;`);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS student_answers (
      id SERIAL PRIMARY KEY,
      student_quiz_id INTEGER NOT NULL REFERENCES student_quizzes(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      answer TEXT NOT NULL,
      code_answer TEXT,
      code_output TEXT,
      code_error TEXT,
      score INTEGER,
      feedback TEXT,
      ai_analysis JSONB
    );
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS attempt_events (
      id SERIAL PRIMARY KEY,
      student_quiz_id INTEGER NOT NULL REFERENCES student_quizzes(id),
      type TEXT NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.execute(sql2`CREATE INDEX IF NOT EXISTS idx_attempt_events_student_quiz_id ON attempt_events(student_quiz_id);`);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade_level TEXT NOT NULL
    );
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS class_students (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id),
      student_id INTEGER NOT NULL REFERENCES users(id)
    );
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS practice_quizzes (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      question_count INTEGER NOT NULL,
      score INTEGER,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS practice_quiz_questions (
      id SERIAL PRIMARY KEY,
      practice_quiz_id INTEGER NOT NULL REFERENCES practice_quizzes(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      answer TEXT,
      score INTEGER,
      feedback TEXT,
      ai_analysis JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(practice_quiz_id, question_id)
    );
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      related_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("All tables created successfully!");
}
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables().then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  }).catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
}

// server/index.ts
import { WebSocketServer } from "ws";
import { spawn, exec } from "child_process";
import fs2 from "fs";
import path4 from "path";
import os from "os";
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    await createTables();
  } catch (e) {
    console.error("Migration failed:", e);
  }
  await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = /* @__PURE__ */ new Set();
  function send(ws, msg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
    }
  }
  function broadcast(filter, msg) {
    for (const c of clients) {
      if (filter(c)) send(c.ws, msg);
    }
  }
  const consentMap = /* @__PURE__ */ new Map();
  wss.on("connection", (ws, req) => {
    const client3 = { ws, role: null, userId: null, quizId: null };
    clients.add(client3);
    try {
      log(`WS connected from ${req.socket.remoteAddress}`);
    } catch {
    }
    ws.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg.type === "register") {
        client3.role = msg.role;
        client3.userId = msg.userId ?? null;
        client3.quizId = msg.quizId ?? null;
        try {
          log(`WS register: role=${client3.role} user=${client3.userId} quiz=${client3.quizId}`);
        } catch {
        }
        return;
      }
      if (msg.type === "request_webcam" && client3.role === "teacher") {
        const { studentId, quizId } = msg;
        try {
          log(`WS request_webcam quiz=${quizId} student=${studentId} from teacher=${client3.userId}`);
        } catch {
        }
        broadcast((c) => c.role === "student" && c.userId === studentId && c.quizId === quizId, {
          type: "webcam_consent_request",
          quizId,
          teacherId: client3.userId
        });
        return;
      }
      if (msg.type === "webcam_consent" && client3.role === "student") {
        const { quizId, teacherId, approved } = msg;
        const key = `${quizId}:${client3.userId}`;
        if (approved) consentMap.set(key, teacherId);
        else consentMap.delete(key);
        try {
          log(`WS consent: quiz=${quizId} student=${client3.userId} -> teacher=${teacherId} approved=${approved}`);
        } catch {
        }
        broadcast((c) => c.role === "teacher" && c.userId === teacherId, {
          type: "webcam_consent_result",
          quizId,
          studentId: client3.userId,
          approved
        });
        return;
      }
      if (msg.type === "frame" && client3.role === "student") {
        const { quizId, dataUrl } = msg;
        const key = `${quizId}:${client3.userId}`;
        const approvedTeacherId = consentMap.get(key);
        if (!approvedTeacherId) return;
        broadcast((c) => c.role === "teacher" && c.userId === approvedTeacherId, {
          type: "frame",
          quizId,
          studentId: client3.userId,
          dataUrl,
          ts: Date.now()
        });
        return;
      }
    });
    ws.on("error", (e) => {
      try {
        log(`WS error: ${String(e)}`);
      } catch {
      }
    });
    ws.on("close", () => {
      if (client3.role === "student" && client3.userId && client3.quizId) {
        const key = `${client3.quizId}:${client3.userId}`;
        consentMap.delete(key);
      }
      clients.delete(client3);
      try {
        log(`WS closed for role=${client3.role} user=${client3.userId}`);
      } catch {
      }
    });
  });
  const simulationStates = /* @__PURE__ */ new WeakMap();
  function simulateCodeExecution(code, ws) {
    const state = {
      code,
      step: 0,
      inputs: [],
      finished: false,
      needsInput: code.includes("cin") || code.includes("scanf") || code.includes("getline"),
      outputStatements: []
    };
    simulationStates.set(ws, state);
    const hasIncludes = code.includes("#include");
    const hasMain = code.includes("main");
    if (!hasIncludes) {
      ws.send(JSON.stringify({
        type: "output",
        data: "Compilation error: Missing #include statements\n"
      }));
      ws.send(JSON.stringify({ type: "finished" }));
      return;
    }
    if (!hasMain) {
      ws.send(JSON.stringify({
        type: "output",
        data: "Compilation error: Missing main() function\n"
      }));
      ws.send(JSON.stringify({ type: "finished" }));
      return;
    }
    ws.send(JSON.stringify({ type: "output", data: "=== Compilation Successful ===\n" }));
    ws.send(JSON.stringify({ type: "output", data: "=== Program Output ===\n" }));
    const coutMatches = code.match(/cout\s*<<\s*[^;]+;/g);
    if (coutMatches) {
      state.outputStatements = coutMatches.map((match) => {
        const stringMatch = match.match(/"([^"]+)"/);
        return stringMatch ? stringMatch[1] : "cout << [expression]";
      });
    }
    setTimeout(() => continueSimulation(ws), 300);
  }
  function continueSimulation(ws) {
    const state = simulationStates.get(ws);
    if (!state || state.finished) return;
    if (state.step < state.outputStatements.length) {
      const output = state.outputStatements[state.step];
      ws.send(JSON.stringify({ type: "output", data: output + "\n" }));
      state.step++;
      if (state.needsInput && state.inputs.length === 0) {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: "input_request", prompt: "Enter input: " }));
        }, 200);
      } else {
        setTimeout(() => continueSimulation(ws), 300);
      }
      return;
    }
    if (state.needsInput && state.inputs.length === 0) {
      ws.send(JSON.stringify({ type: "input_request", prompt: "Enter input: " }));
      return;
    }
    state.finished = true;
    ws.send(JSON.stringify({ type: "output", data: "\n=== Program finished with exit code 0 ===\n" }));
    ws.send(JSON.stringify({ type: "finished" }));
    simulationStates.delete(ws);
  }
  function handleSimulationInput(ws, inputData) {
    const state = simulationStates.get(ws);
    if (!state || state.finished) return false;
    state.inputs.push(inputData);
    ws.send(JSON.stringify({ type: "output", data: `Input received: ${inputData}
` }));
    setTimeout(() => continueSimulation(ws), 200);
    return true;
  }
  const codeWss = new WebSocketServer({ server, path: "/ws/code" });
  codeWss.on("connection", (ws) => {
    console.log("\u{1F517} WebSocket client connected");
    ws.send(JSON.stringify({ type: "connected", message: "Connected to code execution service" }));
    let currentProcess = null;
    let codeFile = "";
    let exeFile = "";
    let inputRequested = false;
    const cleanup = () => {
      if (currentProcess) {
        currentProcess.kill();
        currentProcess = null;
      }
      if (codeFile && fs2.existsSync(codeFile)) fs2.unlinkSync(codeFile);
      if (exeFile && fs2.existsSync(exeFile)) fs2.unlinkSync(exeFile);
      codeFile = "";
      exeFile = "";
      inputRequested = false;
      simulationStates.delete(ws);
    };
    ws.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg.type === "run") {
        cleanup();
        const code = msg.code;
        const tempDir = os.tmpdir();
        codeFile = path4.join(tempDir, `code_${Date.now()}.cpp`);
        exeFile = path4.join(tempDir, `exe_${Date.now()}`);
        fs2.writeFileSync(codeFile, code);
        exec(`g++ "${codeFile}" -o "${exeFile}"`, (error, stdout, stderr) => {
          if (error) {
            if (error.message.includes("'g++' is not recognized") || error.code === "ENOENT") {
              ws.send(JSON.stringify({ type: "output", data: "C++ Compiler not found - Using simulation mode\n" }));
              simulateCodeExecution(code, ws);
              return;
            }
            ws.send(JSON.stringify({ type: "output", data: stderr || error.message }));
            ws.send(JSON.stringify({ type: "finished" }));
            return;
          }
          currentProcess = spawn(exeFile, [], { stdio: ["pipe", "pipe", "pipe"] });
          inputRequested = false;
          currentProcess.stdout.on("data", (data2) => {
            const output = data2.toString();
            ws.send(JSON.stringify({ type: "output", data: output }));
            if (!inputRequested && (output.includes("Enter") || output.includes("Input") || output.includes(":") || output.endsWith("?"))) {
              inputRequested = true;
              setTimeout(() => {
                if (currentProcess && !currentProcess.killed) {
                  ws.send(JSON.stringify({ type: "input_request", prompt: "> " }));
                }
              }, 100);
            }
          });
          currentProcess.stderr.on("data", (data2) => {
            ws.send(JSON.stringify({ type: "output", data: data2.toString() }));
          });
          currentProcess.on("close", (code2) => {
            ws.send(JSON.stringify({ type: "output", data: `
Program finished with exit code ${code2}
` }));
            ws.send(JSON.stringify({ type: "finished" }));
            cleanup();
          });
          if (code.includes("cin") || code.includes("scanf") || code.includes("getline")) {
            setTimeout(() => {
              if (currentProcess && !currentProcess.killed && !inputRequested) {
                inputRequested = true;
                ws.send(JSON.stringify({ type: "input_request", prompt: "> " }));
              }
            }, 500);
          }
        });
      } else if (msg.type === "input") {
        if (handleSimulationInput(ws, msg.data)) {
          return;
        }
        if (currentProcess && !currentProcess.killed) {
          currentProcess.stdin.write(msg.data + "\n");
          inputRequested = false;
        }
      } else if (msg.type === "stop") {
        cleanup();
        ws.send(JSON.stringify({ type: "output", data: "\nExecution stopped\n" }));
        ws.send(JSON.stringify({ type: "finished" }));
      }
    });
    ws.on("close", () => {
      cleanup();
    });
    ws.on("error", () => {
      cleanup();
    });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5e3;
  const host = (process.env.HOST || "").trim() || void 0;
  server.listen(port, host, async () => {
    const shownHost = host ?? "0.0.0.0";
    log(`serving on http://${shownHost}:${port}`);
    try {
      await initializeSampleData();
    } catch (e) {
      console.error(e);
    }
  });
})();
