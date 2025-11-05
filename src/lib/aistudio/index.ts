
import { GoogleGenerativeAI } from '@google/generative-ai';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/firebase'; // Assuming you have a Firebase export

const MODEL_STORAGE_KEY = 'aiStudioModel';
const GEMMA_MODEL = 'gemma-3-27b-it';

/**
 * Validates the given Google AI Studio API key by making a test call.
 * @param apiKey The API key to validate.
 * @returns A boolean indicating whether the key is valid.
 */
export function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Make a lightweight call to check if the API key is valid
    return genAI.getGenerativeModel({ model: GEMMA_MODEL }).generateContent('test').then(() => true);
  } catch (error) {
    console.error('API key validation failed:', error);
    return Promise.resolve(false);
  }
}

/**
 * Saves the given API key to the user's document in Firestore.
 * @param userId The ID of the user.
 * @param apiKey The API key to save.
 */
export async function saveApiKey(userId: string, apiKey: string): Promise<void> {
  try {
    const userDocRef = doc(firestore, 'users', userId);
    await setDoc(userDocRef, { aiStudioApiKey: apiKey }, { merge: true });
  } catch (error) {
    console.error('Failed to save API key to Firestore:', error);
    throw new Error('Failed to save API key.');
  }
}

/**
 * Retrieves the API key from the user's document in Firestore.
 * @param userId The ID of the user.
 * @returns The API key, or null if it's not set.
 */
export async function getApiKey(userId: string): Promise<string | null> {
  try {
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data().aiStudioApiKey || null;
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve API key from Firestore:', error);
    return null;
  }
}

/**
 * Saves the given model to the browser's local storage.
 * @param model The model to save.
 */
export function saveModel(model: string): void {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, model);
  } catch (error) {
    console.error('Failed to save model to local storage:', error);
    throw new Error('Failed to save model.');
  }
}

/**
 * Retrieves the model from the browser's local storage.
 * @returns The model, or null if it's not set.
 */
export function getModel(): string | null {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to retrieve model from local storage:', error);
    return null;
  }
}
