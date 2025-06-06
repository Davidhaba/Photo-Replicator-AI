// src/ai/flows/recreate-image.ts
'use server';
/**
 * @fileOverview AI flow for recreating an image based on a data URI.
 *
 * - recreateImage - A function that recreates an image from a data URI.
 * - RecreateImageInput - The input type for the recreateImage function.
 * - RecreateImageOutput - The output type for the recreateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecreateImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be recreated, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RecreateImageInput = z.infer<typeof RecreateImageInputSchema>;

const RecreateImageOutputSchema = z.object({
  recreatedImage: z
    .string()
    .describe("The AI-recreated image, as a data URI."),
});
export type RecreateImageOutput = z.infer<typeof RecreateImageOutputSchema>;

export async function recreateImage(input: RecreateImageInput): Promise<RecreateImageOutput> {
  return recreateImageFlow(input);
}

const recreateImageFlow = ai.defineFlow(
  {
    name: 'recreateImageFlow',
    inputSchema: RecreateImageInputSchema,
    outputSchema: RecreateImageOutputSchema,
  },
  async (input: RecreateImageInput) => {
    const promptForGenerate = [
      {media: {url: input.photoDataUri}},
      {text: 'Recreate the above image as closely as possible.'},
    ];

    const {media} = await ai.generate({
      prompt: promptForGenerate,
      model: 'googleai/gemini-2.0-flash-exp', // Explicitly use the image generation model
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Required for image generation
      },
    });

    if (!media || !media.url) {
      console.error('Image generation failed or did not return a media URL.', media);
      throw new Error('AI image recreation failed to produce an image.');
    }

    return {recreatedImage: media.url};
  }
);
