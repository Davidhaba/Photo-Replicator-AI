
'use server';

import { generateWebpageFromImage, type GenerateWebpageInput, type GenerateWebpageOutput } from '@/ai/flows/generate-webpage-from-image';
import { z } from 'zod';

const ProcessImageInputSchema = z.object({
  photoDataUri: z.string().startsWith('data:image/', { message: "Invalid image data URI format. Must start with 'data:image/'." }),
  previousContent: z.string().optional(),
  attemptNumber: z.number().optional(),
});

export interface GenerateWebpageResult {
  generatedCode?: string;
  error?: string;
  isComplete?: boolean; 
  finishReasonStr?: string; 
  finishMessageStr?: string;
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
    
    const marker = "<!-- MORE_CONTENT_TO_FOLLOW -->";
    if (responseChunk.isComplete && htmlChunk.includes(marker)) {
        htmlChunk = htmlChunk.replace(marker, "").trimEnd();
    }


    if ((!htmlChunk || htmlChunk.trim() === "") && !responseChunk.isComplete && !previousContent) {
      let specificError = "AI did not generate initial content.";
      if (responseChunk.finishReasonStr) {
        specificError += ` (Reason: ${responseChunk.finishReasonStr}`;
        if (responseChunk.finishMessageStr) {
          specificError += ` - ${responseChunk.finishMessageStr}`;
        }
        specificError += `).`;
      }
      specificError += " This might be due to image complexity, content restrictions, or a temporary issue. Please try a different image or try again later.";
      
      return { 
        error: specificError, 
        generatedCode: "", 
        isComplete: true,
        finishReasonStr: responseChunk.finishReasonStr,
        finishMessageStr: responseChunk.finishMessageStr
      };
    }
    
    return { 
      generatedCode: htmlChunk, 
      isComplete: responseChunk.isComplete,
      finishReasonStr: responseChunk.finishReasonStr,
      finishMessageStr: responseChunk.finishMessageStr
    };

  } catch (e: any) {
    console.error(`Error in generateWebpageAction (attempt ${attemptNumber}):`, e);
    let errorMessage = "An unexpected error occurred during webpage code generation.";
    let finishReasonStr: string | undefined = undefined;
    let finishMessageStr: string | undefined = undefined;

    // Attempt to extract Genkit-specific error details
    if (e.cause && typeof e.cause === 'object') {
        const cause = e.cause as any;
        if (cause.candidates && Array.isArray(cause.candidates) && cause.candidates.length > 0 && cause.candidates[0]) {
            const candidateError = cause.candidates[0];
            finishReasonStr = candidateError.finishReason?.toString();
            finishMessageStr = candidateError.finishMessage;
        } else if (cause.finishReason) { // Simpler structure if error is directly from model response
            finishReasonStr = cause.finishReason?.toString();
            finishMessageStr = cause.finishMessage;
        }
    }
    
    if (e.message.toLowerCase().includes("safety") || e.message.toLowerCase().includes("blocked") || (finishReasonStr && (finishReasonStr.toUpperCase() === "SAFETY" || finishReasonStr.toUpperCase() === "RECITATION" || finishReasonStr.toUpperCase() === "OTHER"))) {
         errorMessage = "The AI was unable to process this request due to content restrictions or an internal model error.";
         if (finishReasonStr) errorMessage += ` (Reason: ${finishReasonStr})`;
         if (finishMessageStr) errorMessage += ` - Message: ${finishMessageStr}`;
         errorMessage += " Please try a different image or simplify the request.";
    } else if (e.message.includes("429 Too Many Requests") || e.message.toLowerCase().includes("quota")) {
        errorMessage = "You've exceeded the current API usage limits. Please try again later or check your plan and billing details.";
    } else if (e.message) {
        errorMessage = e.message;
    }

    return { 
        error: errorMessage, 
        isComplete: true,
        finishReasonStr: finishReasonStr,
        finishMessageStr: finishMessageStr
    };
  }
}
