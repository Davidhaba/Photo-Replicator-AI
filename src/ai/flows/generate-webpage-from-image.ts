
'use server';
/**
 * @fileOverview AI flow for generating a webpage (HTML/CSS) from an image.
 *
 * - generateWebpageFromImage - A function that takes an image data URI and returns HTML/CSS code.
 * - GenerateWebpageInput - The input type for the generateWebpageFromImage function.
 * - GenerateWebpageOutput - The output type for the generateWebpageFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWebpageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be converted into a webpage, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateWebpageInput = z.infer<typeof GenerateWebpageInputSchema>;

const GenerateWebpageOutputSchema = z.object({
  htmlContent: z
    .string()
    .describe('A single string containing the full HTML and embedded CSS code for the webpage that visually replicates the input image.'),
});
export type GenerateWebpageOutput = z.infer<typeof GenerateWebpageOutputSchema>;

export async function generateWebpageFromImage(input: GenerateWebpageInput): Promise<GenerateWebpageOutput> {
  return generateWebpageFlow(input);
}

const generateWebpagePrompt = ai.definePrompt({
  name: 'generateWebpagePrompt',
  input: {schema: GenerateWebpageInputSchema},
  output: {schema: GenerateWebpageOutputSchema},
  prompt: `You are an expert web developer AI specializing in converting images into single-file HTML webpages.
Your task is to analyze the provided image and generate a complete HTML document that visually replicates it as closely as possible.

Image: {{media url=photoDataUri}}

Instructions:
1.  The output MUST be a single string containing a full HTML document, including \`<html>\`, \`<head>\`, and \`<body>\` tags.
2.  All CSS styles required to replicate the image's appearance (layout, colors, fonts, spacing, etc.) MUST be included directly in the HTML. This can be done using \`<style>\` tags within the \`<head>\` section, or as inline styles on individual HTML elements. Do NOT link to external CSS files.
3.  If the image contains text, try to replicate it. If exact font matching is difficult, choose a common web-safe font that is visually similar.
4.  Focus on recreating the structural layout, color palette, and key visual elements from the image.
5.  The generated webpage should be static. Do not include JavaScript unless absolutely necessary for basic visual presentation that cannot be achieved with HTML/CSS alone (prefer CSS for animations/transitions if needed).
6.  Ensure the HTML is well-formed and valid.
7.  Return only the HTML code. Do not include any explanations, apologies, or conversational text before or after the HTML code block.
8.  Use placeholder text like "Lorem ipsum..." if the text in the image is not clearly legible but its presence and approximate size/shape are important for the layout.
9.  For images or complex graphical elements within the original image, you might need to describe them or use CSS to approximate their appearance (e.g. gradients, shapes). You cannot embed new images.
10. Make sure the generated HTML and CSS are reasonably concise and efficient.
11. For colors, use hexadecimal or RGB values as extracted or inferred from the image.
12. Pay attention to responsiveness if the image implies a certain layout (e.g., a mobile screenshot vs. a desktop website screenshot). If not specified, aim for a generally adaptable desktop layout.
`,
  config: {
    temperature: 0.2, // Lower temperature for more deterministic output in code generation
    safetySettings: [ // Adjust safety settings if needed, but be mindful of potential blocks
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ]
  }
});

const generateWebpageFlow = ai.defineFlow(
  {
    name: 'generateWebpageFlow',
    inputSchema: GenerateWebpageInputSchema,
    outputSchema: GenerateWebpageOutputSchema,
  },
  async (input: GenerateWebpageInput) => {
    const {output} = await generateWebpagePrompt(input);
    if (!output || !output.htmlContent) {
        console.error("AI failed to return valid HTML content.", output);
        throw new Error("AI did not generate any HTML content.");
    }
    return output;
  }
);
