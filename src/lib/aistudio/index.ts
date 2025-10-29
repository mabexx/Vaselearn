
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY_STORAGE_KEY = 'aiStudioApiKey';
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
    // Make a lightweight call to check if the API key is valid
    await genAI.getGenerativeModel({ model: GEMMA_MODEL }).generateContent('test');
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
}

/**
 * Saves the given API key to the browser's local storage.
 * @param apiKey The API key to save.
 */
export function saveApiKey(apiKey: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('Failed to save API key to local storage:', error);
    throw new Error('Failed to save API key.');
  }
}

/**
 * Retrieves the API key from the browser's local storage.
 * @returns The API key, or null if it's not set.
 */
export function getApiKey(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to retrieve API key from local storage:', error);
    return null;
  }
}

