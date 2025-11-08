
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY_STORAGE_KEY = 'aiStudioApiKey';
const DEFAULT_MODEL_ID = 'gemini-2.5-flash'; // Set a reliable default model for quiz generation
const TEST_MODEL_ID = 'gemini-2.5-flash'; // Use the same reliable model for validation

/**
 * Validates the given Google AI Studio API key by making a test call.
 * @param apiKey The API key to validate.
 * @returns A boolean indicating whether the key is valid.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use a faster, universally available model for the test
    await genAI.getGenerativeModel({ model: TEST_MODEL_ID }).generateContent('test');
    return true;
  } catch (error) {
    // Log the error more verbosely on the client-side for debugging
    console.error('API key validation failed, full error:', error);
    return false;
  }
}

/**
 * Saves settings.
 * @param apiKey The API key to save.
 */
export function saveSettings(apiKey: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('Failed to save settings to local storage:', error);
    throw new Error('Failed to save API key/settings to local storage.');
  }
}

/**
 * Retrieves the API key and a default model to use if none is explicitly passed.
 * @returns The API key and default model.
 */
export function getSettings(): { apiKey: string | null; defaultModel: string } {
  try {
    return {
      apiKey: localStorage.getItem(API_KEY_STORAGE_KEY),
      defaultModel: DEFAULT_MODEL_ID,
    };
  } catch (error) {
    console.error('Failed to retrieve settings from local storage:', error);
    return { apiKey: null, defaultModel: DEFAULT_MODEL_ID };
  }
}
