
'use server';

import { generateWebpageFromImage, type GenerateWebpageInput, type GenerateWebpageOutput } from '@/ai/flows/generate-webpage-from-image';
import { z } from 'zod';

const ProcessImageInputSchema = z.object({
  photoDataUri: z.string().startsWith('data:image/', { message: "Invalid image data URI format. Must start with 'data:image/'." }),
});

export interface GenerateWebpageResult {
  generatedCode?: string;
  error?: string;
  isComplete?: boolean; 
}

const MAX_GENERATION_ATTEMPTS = 3; // Max number of chunks to fetch

export async function generateWebpageAction(photoDataUri: string): Promise<GenerateWebpageResult> {
  try {
    const validation = ProcessImageInputSchema.safeParse({ photoDataUri });
    if (!validation.success) {
      return { error: validation.error.errors.map(e => e.message).join(', ') };
    }

    let fullHtml = "";
    const initialPhotoDataUri = validation.data.photoDataUri; // Use the same URI for all chunks
    let isGenerationComplete = false;
    let attempts = 0;

    while (attempts < MAX_GENERATION_ATTEMPTS && !isGenerationComplete) {
      attempts++;
      const inputForChunk: GenerateWebpageInput = { 
        photoDataUri: initialPhotoDataUri, 
        previousContent: fullHtml ? fullHtml : undefined // Pass accumulated HTML if not the first attempt
      };
      
      const responseChunk: GenerateWebpageOutput = await generateWebpageFromImage(inputForChunk);

      if (responseChunk.htmlChunk) {
        fullHtml += responseChunk.htmlChunk;
      }
      
      isGenerationComplete = responseChunk.isComplete;

      // If we get no new chunk but it's not complete, and it's not the first attempt,
      // this might indicate an issue with continuation.
      if (!responseChunk.htmlChunk && !isGenerationComplete && attempts > 1) {
        console.warn("AI returned no new content during continuation but indicated it's not complete.");
        // Let's assume it's complete for now to avoid infinite loops if AI misbehaves with marker
        isGenerationComplete = true; 
        // Or return an error:
        // return { error: "AI failed to continue generation. Please try again.", generatedCode: fullHtml };
      }
       if (!responseChunk.htmlChunk && attempts === 1 && !isGenerationComplete) {
         // No content on first attempt, but model says not complete (e.g. only marker)
         return { error: "AI did not generate initial content. Please try again.", generatedCode: "" };
       }
    }

    if (!fullHtml) {
      return { error: "AI failed to generate any webpage code. Please try a different image or try again later." };
    }
    
    if (!isGenerationComplete && attempts >= MAX_GENERATION_ATTEMPTS) {
        console.warn("Webpage generation reached max attempts and might be truncated.");
        // Optionally, notify user that content might be truncated.
        // For now, return what was gathered.
    }

    return { generatedCode: fullHtml, isComplete: isGenerationComplete };

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
    
    if (typeof e === 'object' && e !== null && 'cause' in e) {
        const cause = (e as any).cause;
        if (typeof cause === 'object' && cause !== null && 'message'in cause && typeof cause.message === 'string') {
            if (cause.message.includes('candidate')) { 
                return { error: "The AI was unable to process this image due to content restrictions or internal error. Please try a different image." };
            }
        }
    }
    return { error: errorMessage };
  }
}
