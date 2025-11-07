
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const GEMMA_MODEL = 'gemma-3-27b-it';

/**
 * Validates the given Google AI Studio API key by making a test call.
 * @param apiKey The API key to validate.
 * @returns A boolean indicating whether the key is valid.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) {
    return false;
  }
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
 * Saves the given API key to the user's document in Firestore.
 * @param userId The user's ID.
 * @param apiKey The API key to save.
 */
export async function saveApiKey(userId: string, apiKey: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, { aiStudioApiKey: apiKey }, { merge: true });
  } catch (error) {
    console.error('Failed to save API key to Firestore:', error);
    throw new Error('Failed to save API key.');
  }
}

/**
 * Retrieves the API key from the user's document in Firestore.
 * @param userId The user's ID.
 * @returns The API key, or null if it's not set.
 */
export async function getApiKey(userId: string): Promise<string | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data()?.aiStudioApiKey || null;
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve API key from Firestore:', error);
    return null;
  }
}
