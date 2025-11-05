import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Notes
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
      content: text("content"),
        createdAt: text("created_at").default(new Date().toISOString()),
          updatedAt: text("updated_at").default(new Date().toISOString()),
          });

          // Practice sessions
          export const practiceSessions = sqliteTable("practice_sessions", {
            id: integer("id").primaryKey({ autoIncrement: true }),
              topic: text("topic").notNull(),
                question: text("question"),
                  userAnswer: text("user_answer"),
                    correctAnswer: text("correct_answer"),
                      result: text("result"), // "Correct" or "Wrong"
                        createdAt: text("created_at").default(new Date().toISOString()),
                        });

                        // MistakeVault (derived)
                        export const mistakeVault = sqliteTable("mistake_vault", {
                          id: integer("id").primaryKey({ autoIncrement: true }),
                            practiceId: integer("practice_id"), // link to Practice session
                              topic: text("topic"),
                                question: text("question"),
                                  userAnswer: text("user_answer"),
                                    correctAnswer: text("correct_answer"),
              explanation: text("explanation"),
                                      createdAt: text("created_at").default(new Date().toISOString()),
                                      });