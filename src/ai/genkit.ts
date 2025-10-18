
'use server';
/**
 * @fileoverview This file initializes the Genkit AI singleton with the Google GenAI plugin.
 * It ensures that the AI instance is created only once and can be reused across the application.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the AI instance with the Google GenAI plugin.
// This is a singleton; it will only be created once.
export const ai = genkit({
  plugins: [googleAI()],
});
