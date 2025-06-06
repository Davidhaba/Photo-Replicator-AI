
'use server';

import { generateWebpageFromImage, type GenerateWebpageInput } from '@/ai/flows/generate-webpage-from-image';
import { z } from 'zod';

const ProcessImageInputSchema = z.object({
  photoDataUri: z.string().startsWith('data:image/', { message: "Invalid image data URI format. Must start with 'data:image/'." }),
});

export interface GenerateWebpageResult {
  generatedCode?: string;
  error?: string;
}

export async function generateWebpageAction(photoDataUri: string): Promise<GenerateWebpageResult> {
  try {
    const validation = ProcessImageInputSchema.safeParse({ photoDataUri });
    if (!validation.success) {
      return { error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const input: GenerateWebpageInput = { photoDataUri: validation.data.photoDataUri };

    const response = await generateWebpageFromImage(input);
    
    if (!response.htmlContent) {
      return { error: "AI failed to generate webpage code. Please try a different image or try again later." };
    }

    return { generatedCode: response.htmlContent };

  } catch (e) {
    console.error("Error in generateWebpageAction:", e);
    let errorMessage = "An unexpected error occurred during webpage code generation.";
    if (e instanceof Error) {
      if (e.message.includes("429 Too Many Requests") || e.message.toLowerCase().includes("quota")) {
        errorMessage = "You've exceeded the current API usage limits. Please try again later or check your plan and billing details.";
      } else {
        errorMessage = e.message;
      }
    }
    
    // Check for specific Genkit/AI related error messages if possible
    if (typeof e === 'object' && e !== null && 'cause' in e) {
        const cause = (e as any).cause;
        if (typeof cause === 'object' && cause !== null && 'message' in cause && typeof cause.message === 'string') {
            if (cause.message.includes('candidate')) { // Gemini often includes 'candidate' in safety/block responses
                return { error: "The AI was unable to process this image due to content restrictions or internal error. Please try a different image." };
            }
        }
    }
    return { error: errorMessage };
  }
}
