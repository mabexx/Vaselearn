import { db } from "@/db";
import { practiceSessions, mistakeVault } from "@/db/schema";

export function addPracticeSession(topic, question, userAnswer, correctAnswer, explanation) {
  const result = userAnswer === correctAnswer ? "Correct" : "Wrong";

    // Insert practice session
      const inserted = db.insert(practiceSessions)
          .values({ topic, question, userAnswer, correctAnswer, result })
              .run();

                // If wrong, also insert into MistakeVault
                  if (result === "Wrong") {
                      db.insert(mistakeVault)
                            .values({
                                    practiceId: inserted.lastInsertRowid,
                                            topic,
                                                    question,
                                                            userAnswer,
                                                                    correctAnswer,
                                                                    explanation,
                                                                          })
                                                                                .run();
                                                                                  }
                                                                                  }

                                                                                  export function getAllPracticeSessions() {
                                                                                    return db.select().from(practiceSessions).all();
                                                                                    }