'use server';

import { generateWebpageFromImage, type GenerateWebpageInput, type GenerateWebpageOutput } from '@/ai/flows/generate-webpage-from-image';
import { z } from 'zod';

const ProcessImageInputSchema = z.object({
  photoDataUri: z.string().startsWith('data:image/', { message: "Invalid image data URI format. Must start with 'data:image/'." }),
  previousContent: z.string().optional(),
  attemptNumber: z.number().optional(), // Add attemptNumber to schema
});

export interface GenerateWebpageResult {
  generatedCode?: string;
  error?: string;
  isComplete?: boolean; 
}

export async function generateWebpageAction(photoDataUri: string, previousContent?: string, attemptNumber: number = 1): Promise<GenerateWebpageResult> {
  try {
    const validation = ProcessImageInputSchema.safeParse({ photoDataUri, previousContent, attemptNumber });
    if (!validation.success) {
      return { error: validation.error.errors.map(e => e.message).join(', '), isComplete: true };
    }

    const inputForChunk: GenerateWebpageInput = { 
      photoDataUri: validation.data.photoDataUri, 
      previousContent: validation.data.previousContent,
      attemptNumber: validation.data.attemptNumber
    };
    
    const responseChunk: GenerateWebpageOutput = await generateWebpageFromImage(inputForChunk);

    let htmlChunk = responseChunk.htmlChunk ?? "";

    // More robust stripping of markdown code blocks, also done in the flow but good to have here as a fallback
    const markdownBlockRegex = new RegExp(/^```(?:html)?\s*([\s\S]*?)\s*```$/);
    const match = htmlChunk.trim().match(markdownBlockRegex);
    if (match && match[1]) {
      htmlChunk = match[1].trim();
    } else {
        if (htmlChunk.startsWith("```html")) {
            htmlChunk = htmlChunk.substring(7);
        } else if (htmlChunk.startsWith("```")) {
            htmlChunk = htmlChunk.substring(3);
        }
        if (htmlChunk.endsWith("```")) {
            htmlChunk = htmlChunk.substring(0, htmlChunk.length - 3);
        }
        htmlChunk = htmlChunk.trim();
    }
    
    // Ensure no marker is left in the final chunk if it's complete
    const marker = "<!-- MORE_CONTENT_TO_FOLLOW -->";
    if (responseChunk.isComplete && htmlChunk.includes(marker)) {
        htmlChunk = htmlChunk.replace(marker, "").trimEnd();
    }


    if ((!htmlChunk || htmlChunk.trim() === "") && !responseChunk.isComplete && !previousContent) {
      // This case specifically targets the initial generation failing to produce any content.
      return { 
        error: "AI did not generate initial content. This might be due to image complexity or a temporary issue. Please try a different image or try again later.", 
        generatedCode: "", 
        isComplete: true // Mark as complete to stop further attempts on an empty initial response
      };
    }
    
    return { 
      generatedCode: htmlChunk, 
      isComplete: responseChunk.isComplete 
    };

  } catch (e: any) {
    console.error(`Error in generateWebpageAction (attempt ${attemptNumber}):`, e);
    let errorMessage = "An unexpected error occurred during webpage code generation.";
    if (e instanceof Error) {
      if (e.message.includes("429 Too Many Requests") || e.message.toLowerCase().includes("quota")) {
        errorMessage = "You've exceeded the current API usage limits. Please try again later or check your plan and billing details.";
      } else if (e.message.includes("candidate") || (e.cause && typeof e.cause === 'object' && 'message' in e.cause && (e.cause as any).message.includes('candidate'))) {
         errorMessage = "The AI was unable to process this image due to content restrictions or internal error. Please try a different image.";
      } else {
        errorMessage = e.message;
      }
    }
    return { error: errorMessage, isComplete: true }; // Mark as complete on error to stop retries
  }
}
