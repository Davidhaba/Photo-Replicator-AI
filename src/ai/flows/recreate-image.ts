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

const recreateImagePrompt = ai.definePrompt({
  name: 'recreateImagePrompt',
  input: {schema: RecreateImageInputSchema},
  output: {schema: RecreateImageOutputSchema},
  prompt: [
    {media: {url: '{{{photoDataUri}}}'}},
    {text: 'Recreate the above image as closely as possible.'},
  ],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
});

const recreateImageFlow = ai.defineFlow(
  {
    name: 'recreateImageFlow',
    inputSchema: RecreateImageInputSchema,
    outputSchema: RecreateImageOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      prompt: recreateImagePrompt.prompt,
      model: 'googleai/gemini-2.0-flash-exp',
      config: recreateImagePrompt.config,
    });

    return {recreatedImage: media.url!};
  }
);
