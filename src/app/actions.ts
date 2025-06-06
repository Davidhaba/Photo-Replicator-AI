'use server';

import { generateWebpageFromImage, type GenerateWebpageInput, type GenerateWebpageOutput } from '@/ai/flows/generate-webpage-from-image';
import { z } from 'zod';

const ProcessImageInputSchema = z.object({
  photoDataUri: z.string().startsWith('data:image/', { message: "Invalid image data URI format. Must start with 'data:image/'." }),
  previousContent: z.string().optional(),
});

export interface GenerateWebpageResult {
  generatedCode?: string;
  error?: string;
  isComplete?: boolean; 
}

export async function generateWebpageAction(photoDataUri: string, previousContent?: string): Promise<GenerateWebpageResult> {
  try {
    const validation = ProcessImageInputSchema.pick({ photoDataUri: true }).safeParse({ photoDataUri });
    if (!validation.success) {
      return { error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const inputForChunk: GenerateWebpageInput = { 
      photoDataUri: validation.data.photoDataUri, 
      previousContent: previousContent // Pass accumulated HTML if not the first attempt
    };
    
    const responseChunk: GenerateWebpageOutput = await generateWebpageFromImage(inputForChunk);

    let htmlChunk = responseChunk.htmlChunk ?? "";

    // Additional check for markdown, although the flow should handle it.
    const markdownBlockRegex = /^```(?:html)?\s*([\s\S]*?)\s*```$/;
    const match = htmlChunk.trim().match(markdownBlockRegex);
    if (match && match[1]) {
      htmlChunk = match[1].trim();
    } else {
        if (htmlChunk.startsWith("```html") && htmlChunk.endsWith("```")) {
            htmlChunk = htmlChunk.substring(7, htmlChunk.length - 3).trim();
        } else if (htmlChunk.startsWith("```") && htmlChunk.endsWith("```")) {
             htmlChunk = htmlChunk.substring(3, htmlChunk.length - 3).trim();
        }
    }

    if ((!htmlChunk || htmlChunk.trim() === "") && !responseChunk.isComplete && !previousContent) {
      return { error: "AI did not generate initial content. Please try a different image or prompt.", generatedCode: "", isComplete: false };
    }
    
    return { 
      generatedCode: htmlChunk, 
      isComplete: responseChunk.isComplete 
    };

  } catch (e) {
    console.error("Error in generateWebpageAction:", e);
    let errorMessage = "An unexpected error occurred during webpage code generation.";
    if (e instanceof Error) {
      if (e.message.includes("429 Too Many Requests") || e.message.toLowerCase().includes("quota")) {
        errorMessage = "You've exceeded the current API usage limits. Please try again later or check your plan and billing details.";
      } else if (e.message.includes("candidate")) {
         errorMessage = "The AI was unable to process this image due to content restrictions or internal error. Please try a different image.";
      } else {
        errorMessage = e.message;
      }
    } else if (typeof e === 'object' && e !== null && 'cause' in e) {
        const cause = (e as any).cause;
        if (typeof cause === 'object' && cause !== null && 'message'in cause && typeof cause.message === 'string') {
            if (cause.message.includes('candidate')) { 
                errorMessage = "The AI was unable to process this image due to content restrictions or internal error. Please try a different image.";
            }
        }
    }
    return { error: errorMessage };
  }
}