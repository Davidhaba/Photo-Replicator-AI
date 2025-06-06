
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
  prompt: `You are an expert web developer AI specializing in converting images into **hyper-realistic, single-file HTML webpages**.
Your task is to analyze the provided image and generate an **exact 1:1, visually indistinguishable, pixel-perfect clone** of it as a complete HTML document.
The goal is to produce an HTML/CSS webpage that is **indistinguishable** from the source image down to the **smallest detail**. Every visual element, no matter how small or complex, MUST be replicated with extreme precision.

Image: {{media url=photoDataUri}}

**Critical Instructions for Uncompromising Visual Fidelity:**
1.  **Output Format:** The output MUST be a single string containing a complete HTML document, including \`<html>\`, \`<head>\`, and \`<body>\` tags.
2.  **Embedded CSS Only:** ALL CSS styles required to achieve this **perfect visual replica** (layout, colors, fonts, spacing, borders, shadows, gradients, **all graphical elements, intricate patterns, and textual content**) MUST be included directly within the HTML. Use \`<style>\` tags in the \`<head>\` or inline styles. **Absolutely NO external CSS files.**
3.  **Meticulous Detail Replication:** Pay **obsessive attention** to the precise positioning, dimensions (to the pixel), colors (exact hex/RGB/HSL values as seen or inferred), font styles (match as closely as humanly possible with web-safe fonts; consider font weight, letter spacing, line height), spacing, borders (thickness, style, color), shadows (offset, blur, color, spread), and **every single visual attribute** present in the image. **No detail is too small to be ignored or simplified.**
4.  **Text Replication:** If the image contains text, replicate it with **absolute precision** regarding font family, size, weight, color, alignment, and placement. If an exact font match is impossible, choose the closest common web-safe alternative that preserves the visual character.
5.  **Structural and Visual Integrity:** Recreate the structural layout, color palette, and ALL key visual elements from the image with the **highest possible fidelity**. Imagine you are creating a perfect digital forgery of the image using only HTML and CSS. The output must be a **pixel-for-pixel representation** wherever achievable with HTML/CSS. **Do not simplify, omit, or approximate any visual element unless absolutely impossible to render with HTML/CSS, in which case, use CSS to create the closest possible visual effect (e.g., complex gradients, abstract shapes).**
6.  **Static Output (Primarily):** The generated webpage should be static. Do not include JavaScript unless it is the *only* way to achieve a specific visual effect crucial to the replication (e.g., a complex animation that CSS cannot handle). Prefer CSS for any animations or transitions if they are part of the original image's design.
7.  **Valid and Clean Code:** Ensure the HTML is well-formed and valid. While visual accuracy is paramount, strive for reasonably clean and efficient HTML/CSS.
8.  **HTML Only:** Return **ONLY** the HTML code. Do not include any explanations, apologies, or conversational text before or after the HTML code block.
9.  **Placeholder Text (Strictly Limited):** Use placeholder text (e.g., "Lorem ipsum...") ONLY if the text in the image is **utterly illegible** but its presence, approximate size, and shape are critical for maintaining the layout.
10. **Replicating Embedded Visuals & Graphics:** For any non-textual visual elements, icons, complex shapes, or intricate graphical details *within* the original image, you **must** replicate their appearance using HTML and CSS. This involves using CSS to draw shapes, create gradients, or meticulously position and style elements to mimic the graphic. **You cannot embed new raster image files (e.g., \`<img>\` tags pointing to new \`src\` URLs unless the original image was clearly a placeholder for such an image and you are creating a visually identical placeholder).** If an element is too complex to perfectly recreate with CSS, strive for the closest possible visual approximation using advanced CSS techniques. *Your goal is to make the rendered HTML visually identical to the image, including all such details.*
11. **Color Accuracy:** Use exact hexadecimal, RGB, or HSL values as extracted or inferred from the image for all colors.
12. **Responsiveness (If Implied):** Pay attention to responsiveness if the image implies a specific layout (e.g., a mobile screenshot vs. a desktop website screenshot). If not specified, aim for a layout that exactly matches the provided image's dimensions and aspect ratio. The primary goal is to clone the *given* image, not to make it responsive unless the image itself demonstrates responsive behavior.
`,
  config: {
    temperature: 0.1, 
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


    