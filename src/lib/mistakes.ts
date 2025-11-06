import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';

export async function addMistake(
  firestore: Firestore,
  userId: string,
  mistake: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    topic: string;
  }
) {
  const mistakesCollection = collection(firestore, 'users', userId, 'mistakes');

  await addDoc(mistakesCollection, {
    ...mistake,
    createdAt: serverTimestamp(),
  });
}
