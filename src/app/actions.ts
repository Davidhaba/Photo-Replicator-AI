'use server';

import { analyzeImage, type AnalyzeImageInput } from '@/ai/flows/analyze-image';
import { recreateImage, type RecreateImageInput } from '@/ai/flows/recreate-image';
import { z } from 'zod';

const ProcessImageInputSchema = z.object({
  photoDataUri: z.string().startsWith('data:image/', { message: "Invalid image data URI format. Must start with 'data:image/'." }),
});

export interface ProcessImageResult {
  recreatedImageUri?: string;
  analysisResult?: string;
  error?: string;
}

export async function processImageAction(photoDataUri: string): Promise<ProcessImageResult> {
  try {
    const validation = ProcessImageInputSchema.safeParse({ photoDataUri });
    if (!validation.success) {
      return { error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const input: AnalyzeImageInput & RecreateImageInput = { photoDataUri: validation.data.photoDataUri };

    // Run in parallel for efficiency
    const [analysisResponse, recreationResponse] = await Promise.allSettled([
      analyzeImage(input),
      recreateImage(input),
    ]);

    let analysisResultText: string | undefined;
    let recreatedImageUriData: string | undefined;
    const errors: string[] = [];

    if (analysisResponse.status === 'fulfilled') {
      analysisResultText = analysisResponse.value.imageDescription;
    } else {
      console.error("Image analysis failed:", analysisResponse.reason);
      errors.push("Failed to analyze image. The AI might be unable to process this image.");
    }

    if (recreationResponse.status === 'fulfilled') {
      recreatedImageUriData = recreationResponse.value.recreatedImage;
    } else {
      console.error("Image recreation failed:", recreationResponse.reason);
      errors.push("Failed to recreate image. The AI might be unable to process this image.");
    }
    
    if (errors.length > 0 && (!analysisResultText || !recreatedImageUriData)) {
        // If there are errors and one of the critical results is missing, return the error.
        return { error: errors.join(' ') };
    }
    
    if (!recreatedImageUriData && !analysisResultText) {
        return { error: "AI processing failed to produce any results. Please try a different image." };
    }

    return { recreatedImageUri: recreatedImageUriData, analysisResult: analysisResultText, error: errors.length > 0 ? errors.join(' ') : undefined };

  } catch (e) {
    console.error("Error in processImageAction:", e);
    const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred during image processing. Please try again.";
    return { error: errorMessage };
  }
}
