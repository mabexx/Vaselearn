
const API_KEY_STORAGE_KEY = 'aiStudioApiKey';
const MODEL_STORAGE_KEY = 'aiStudioModel';

/**
 * Saves the given API key to the browser's local storage.
 * @param apiKey The API key to save.
 */
export function saveApiKey(apiKey: string): void {
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
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to retrieve API key from local storage:', error);
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
