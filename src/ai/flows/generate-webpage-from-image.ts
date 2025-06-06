
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
Your task is to analyze the provided image and generate an **exact 1:1 visual clone** of it as a complete HTML document.
The goal is to produce an HTML/CSS webpage that is **visually indistinguishable** from the source image. Every detail matters.

Image: {{media url=photoDataUri}}

Instructions:
1.  The output MUST be a single string containing a full HTML document, including \`<html>\`, \`<head>\`, and \`<body>\` tags.
2.  All CSS styles required to create an exact visual replica of the image's appearance (layout, colors, fonts, spacing, borders, shadows, etc.) MUST be included directly in the HTML. This can be done using \`<style>\` tags within the \`<head>\` section, or as inline styles on individual HTML elements. Do NOT link to external CSS files.
3.  Pay **meticulous attention** to the precise positioning, dimensions, colors (use exact hex/RGB values if discernible), font styles (match as closely as possible with web-safe fonts if exact font is unknown), spacing, borders, shadows, and any other visual attribute present in the image.
4.  If the image contains text, replicate it with extreme precision regarding font, size, color, and placement. If exact font matching is difficult, choose the closest common web-safe font.
5.  Focus on recreating the structural layout, color palette, and all key visual elements from the image with the highest possible fidelity. Imagine you are creating a perfect forgery of the image using only HTML and CSS. The output must be a **pixel-perfect representation** where possible.
6.  The generated webpage should be static. Do not include JavaScript unless absolutely necessary for basic visual presentation that cannot be achieved with HTML/CSS alone (prefer CSS for animations/transitions if needed).
7.  Ensure the HTML is well-formed and valid.
8.  Return only the HTML code. Do not include any explanations, apologies, or conversational text before or after the HTML code block.
9.  Use placeholder text like "Lorem ipsum..." ONLY if the text in the image is absolutely illegible but its presence and approximate size/shape are important for the layout.
10. For images or complex graphical elements within the original image, you must describe them or use CSS to approximate their appearance (e.g., gradients, shapes, intricate patterns). You cannot embed new images.
11. Make sure the generated HTML and CSS are reasonably concise and efficient while prioritizing visual accuracy above all else.
12. For colors, use exact hexadecimal or RGB values as extracted or inferred from the image.
13. Pay attention to responsiveness if the image implies a certain layout (e.g., a mobile screenshot vs. a desktop website screenshot). If not specified, aim for a generally adaptable desktop layout that exactly matches the provided image's dimensions and aspect ratio.
`,
  config: {
    temperature: 0.1, // Even lower temperature for more deterministic and precise output
    safetySettings: [ 
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

