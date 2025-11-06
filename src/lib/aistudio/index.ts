
import { GoogleGenerativeAI } from '@google/generative-ai';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase'; // Assuming firestore is exported from your firebase setup

const MODEL_STORAGE_KEY = 'aiStudioModel';
const GEMMA_MODEL = 'gemma-3-27b-it';

/**
 * Validates the given Google AI Studio API key by making a test call.
 * @param apiKey The API key to validate.
 * @returns A boolean indicating whether the key is valid.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    await genAI.getGenerativeModel({ model: GEMMA_MODEL }).generateContent('test');
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
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
    await updateDoc(userDocRef, { aiStudioApiKey: apiKey });
  } catch (error) {
    console.error('Failed to save API key to Firestore:', error);
    throw new Error('Failed to save API key.');
  }
}

/**
 * Retrieves the API key from the user's document in Firestore.
 * This function is safe to use on the client-side.
 * @param userId The ID of the user.
 * @returns The API key, or null if it's not set.
 */
export async function getApiKey(userId: string): Promise<string | null> {
  try {
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && userDoc.data().aiStudioApiKey) {
      return userDoc.data().aiStudioApiKey;
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve API key from Firestore:', error);
    return null;
  }
}

/**
 * Retrieves the API key from the user's document in Firestore.
 * This is intended for server-side use where you already have the db instance.
 * @param db The Firestore database instance.
 * @param userId The ID of the user.
 * @returns The API key, or null if it's not set.
 */
export async function getApiKeyForServer(db: any, userId: string): Promise<string | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && userDoc.data().aiStudioApiKey) {
      return userDoc.data().aiStudioApiKey;
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
    if (typeof window !== 'undefined') {
      localStorage.setItem(MODEL_STORAGE_KEY, model);
    }
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
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MODEL_STORAGE_KEY);
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve model from local storage:', error);
    return null;
  }
}
