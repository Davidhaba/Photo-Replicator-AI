
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

    const markdownBlockRegex = new RegExp(/^```(?:html)?\s*([\s\S]*?)\s*```$/m);
    const match = htmlChunk.trim().match(markdownBlockRegex);
    if (match && match[1]) {
      htmlChunk = match[1].trim();
    } else {
        if (htmlChunk.startsWith("```html")) {
            htmlChunk = htmlChunk.substring(7).trimStart();
        } else if (htmlChunk.startsWith("```")) {
            htmlChunk = htmlChunk.substring(3).trimStart();
        }
        if (htmlChunk.endsWith("```")) {
            htmlChunk = htmlChunk.substring(0, htmlChunk.length - 3).trimEnd();
        }
        htmlChunk = htmlChunk.trim();
    }
    
    const marker = "<!-- MORE_CONTENT_TO_FOLLOW -->";
    if (responseChunk.isComplete && htmlChunk.includes(marker)) {
        htmlChunk = htmlChunk.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'g'), "").trimEnd();
    }


    if ((!htmlChunk || htmlChunk.trim() === "") && !responseChunk.isComplete && !previousContent) {
      let specificError = "AI did not generate initial content.";
      if (responseChunk.finishReasonStr) {
        specificError += ` (Reason: ${responseChunk.finishReasonStr}`;
        if (responseChunk.finishMessageStr) {
          specificError += ` - ${responseChunk.finishMessageStr}`;
        }
        specificError += `).`;
      } else {
        specificError += " No specific reason provided by AI service for empty initial content.";
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
    console.error(`Error in generateWebpageAction (attempt ${attemptNumber}):`, JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
    
    let errorMessage = "An unexpected error occurred during webpage code generation.";
    let details = "";
    let finishReasonStr: string | undefined = undefined;
    let finishMessageStr: string | undefined = undefined;

    if (e.message) {
        errorMessage = e.message;
    }

    if (e.cause && typeof e.cause === 'object') {
        const cause = e.cause as any;
        if (cause.message && typeof cause.message === 'string') {
            details += ` Caused by: ${cause.message}.`;
        }
        
        // Try to extract finishReason and finishMessage from cause, as Genkit might put it there
        if (cause.finishReason) {
            finishReasonStr = cause.finishReason.toString();
            details += ` Finish Reason (from cause): ${finishReasonStr}.`;
        }
        if (cause.finishMessage) {
            finishMessageStr = cause.finishMessage.toString();
            details += ` Finish Message (from cause): ${finishMessageStr}.`;
        }

        // Look for candidates in cause, common in Genkit error structures for model responses
        if (!finishReasonStr && cause.candidates && Array.isArray(cause.candidates) && cause.candidates.length > 0 && cause.candidates[0]) {
            const candidateError = cause.candidates[0];
            if (candidateError.finishReason) {
                finishReasonStr = candidateError.finishReason.toString();
                details += ` Finish Reason (from candidate): ${finishReasonStr}.`;
            }
            if (candidateError.finishMessage) {
                finishMessageStr = candidateError.finishMessage.toString();
                details += ` Finish Message (from candidate): ${finishMessageStr}.`;
            }
        }
        
        if (!details && Object.keys(cause).length > 0) {
            try {
                details += ` Cause details: ${JSON.stringify(cause, Object.getOwnPropertyNames(cause), 2)}.`;
            } catch (jsonError) {
                details += ` Cause details: (Could not stringify cause).`;
            }
        }
    } else if (typeof e.cause === 'string') {
        details += ` Cause: ${e.cause}.`;
    }


    if (e.message?.toLowerCase().includes("safety") || e.message?.toLowerCase().includes("blocked") || (finishReasonStr && (finishReasonStr.toUpperCase() === "SAFETY" || finishReasonStr.toUpperCase() === "RECITATION" || finishReasonStr.toUpperCase() === "OTHER"))) {
         errorMessage = "The AI was unable to process this request due to content restrictions or an internal model error.";
         if (finishReasonStr) errorMessage += ` (Reason: ${finishReasonStr})`;
         if (finishMessageStr) errorMessage += ` - Message: ${finishMessageStr}`;
         errorMessage += " Please try a different image or simplify the request.";
    } else if (e.message?.includes("429") || e.message?.toLowerCase().includes("quota") || e.message?.toLowerCase().includes("rate limit")) {
        errorMessage = "You've exceeded the current API usage limits or requests are too frequent. Please try again later or check your plan and billing details.";
    }

    // Append any gathered details if the primary errorMessage is still generic or could use more info
    if (details && !errorMessage.includes(details.substring(0,50))) { // Avoid appending if already included (approx)
        errorMessage += ` Additional details: ${details}`;
    }
    
    // Sanitize error message to prevent extremely long messages
    if (errorMessage.length > 1000) {
        errorMessage = errorMessage.substring(0, 1000) + "... (message truncated)";
    }

    return { 
        error: errorMessage, 
        isComplete: true, // Critical error, so generation is considered complete/failed
        finishReasonStr: finishReasonStr, // Pass along if found
        finishMessageStr: finishMessageStr // Pass along if found
    };
  }
}
