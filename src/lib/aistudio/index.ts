
import { GoogleGenerativeAI } from '@google/generative-ai';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

const { firestore: db } = initializeFirebase();
const GEMMA_MODEL = 'gemma-3-27b-it';

/**
 * Validates the given Google AI Studio API key by making a test call.
 * @param apiKey The API key to validate.
 * @returns A boolean indicating whether the key is valid.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Make a lightweight call to check if the API key is valid
    await genAI.getGenerativeModel({ model: GEMMA_MODEL }).generateContent('test');
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
}

/**
 * Saves the given API key to the current user's profile in Firestore.
 * @param apiKey The API key to save.
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { aiStudioApiKey: apiKey }, { merge: true });
    } catch (error) {
      console.error('Failed to save API key:', error);
      throw new Error('Failed to save API key.');
    }
  } else {
    throw new Error('User not authenticated.');
  }
}

/**
 * Retrieves the API key from the current user's profile in Firestore.
 * @returns The API key, or null if it's not set.
 */
export async function getApiKey(): Promise<string | null> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    return userDoc.data()?.aiStudioApiKey || null;
  } else {
    return null;
  }
}
