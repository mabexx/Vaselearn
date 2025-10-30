import { addNote, getAllNotes } from "../app/notes/actions";
import { addPracticeSession, getAllPracticeSessions } from "../app/practice/actions";
import { getAllMistakes } from "../app/mistake-vault/actions";

// Test Notes
addNote("Test Note", "This is a test note content");

// Test Practice (one correct, one wrong)
addPracticeSession("Math", "2+2=?", "4", "4"); // correct
addPracticeSession("Math", "5*5=?", "20", "25"); // wrong

// MistakeVault should automatically contain only wrong answers
