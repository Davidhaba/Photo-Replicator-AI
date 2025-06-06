
'use server';
/**
 * @fileOverview AI flow for generating a webpage (HTML/CSS) from an image, with support for multi-part generation.
 *
 * - generateWebpageFromImage - A function that takes an image data URI and optional previous content, returns an HTML chunk and completion status.
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
  previousContent: z.string().optional().describe("Previously generated HTML content, if this is a continuation request."),
});
export type GenerateWebpageInput = z.infer<typeof GenerateWebpageInputSchema>;

const GenerateWebpageOutputSchema = z.object({
  htmlChunk: z
    .string()
    .optional()
    .describe('A chunk of the HTML/CSS code for the webpage.'),
  isComplete: z.boolean().describe("True if the generation is complete, false if more content is expected to follow."),
});
export type GenerateWebpageOutput = z.infer<typeof GenerateWebpageOutputSchema>;

export async function generateWebpageFromImage(input: GenerateWebpageInput): Promise<GenerateWebpageOutput> {
  return generateWebpageFlow(input);
}

// Note: We are not using ai.definePrompt here because the prompt text needs to be dynamically constructed
// based on whether it's an initial request or a continuation. We will use ai.generate directly.

const generateWebpageFlow = ai.defineFlow(
  {
    name: 'generateWebpageFlow',
    inputSchema: GenerateWebpageInputSchema,
    outputSchema: GenerateWebpageOutputSchema,
  },
  async (input: GenerateWebpageInput) => {
    const marker = "<!-- MORE_CONTENT_TO_FOLLOW -->";
    let promptSegments: ({text: string} | {media: {url: string}})[] = [];

    const commonInstructions = `
**Critical Instructions for Uncompromising Visual Fidelity AND Completeness:**
1.  **Output Format:** The output MUST be a single string containing a complete HTML document, including \`<html>\`, \`<head>\`, and \`<body>\` tags.
2.  **Embedded CSS Only:** ALL CSS styles required to achieve this **perfect visual replica** (layout, colors, fonts, spacing, borders, shadows, gradients, **all graphical elements, intricate patterns, and textual content**) MUST be included directly within THE HTML. Use \`<style>\` tags in the \`<head>\` or inline styles. **Absolutely NO external CSS files.**
3.  **Uncompromising Meticulous Detail Replication:** You must achieve **pixel-perfect accuracy**. Pay **obsessive, forensic-level attention** to the precise positioning (x, y coordinates), dimensions (width, height, to the exact pixel), colors (extract or infer exact hex/RGB/HSL values), font styles (if identifiable, use the exact font; otherwise, find the closest web-safe match that replicates the visual character, weight, size, letter spacing, line height), spacing (margins, padding), borders (thickness, style, color, radius), shadows (offset, blur, color, spread), gradients (type, direction, color stops), and **every single visual attribute** present in the image. **Absolutely NO detail is too small to be ignored, simplified, or approximated. If a visual effect exists in the image, it MUST be replicated in the HTML/CSS.**
4.  **Text Replication:** If the image contains text, replicate it with **absolute precision** regarding font family, size, weight, color, alignment, and placement. If an exact font match is impossible, choose the closest common web-safe alternative that preserves the visual character.
5.  **Structural and Visual Integrity:** Recreate the structural layout, color palette, and ALL key visual elements from the image with the **highest possible fidelity**. Imagine you are creating a perfect digital forgery of the image using only HTML and CSS. The output must be a **pixel-for-pixel representation** wherever achievable with HTML/CSS.
6.  **Static Output (Primarily):** The generated webpage should be static. Do not include JavaScript unless it is the *only* way to achieve a specific visual effect crucial to the replication.
7.  **Valid and Clean Code:** Ensure the HTML is well-formed and valid.
8.  **HTML Only:** Return **ONLY** the HTML code.
9.  **Placeholder Text (Strictly Limited):** Use placeholder text (e.g., "Lorem ipsum...") ONLY if the text in the image is **utterly illegible**.
10. **Flawless Replication of ALL Embedded Visuals & Graphics:** Any non-textual visual elements, including icons, logos, illustrations, patterns, complex shapes, cutouts, transparencies, and intricate graphical details *within* the original image, **MUST be flawlessly recreated using only HTML and CSS.** This demands advanced CSS (SVG-in-HTML, complex gradients, \\\`clip-path\\\`, \\\`mask-image\\\`, pseudo-elements, filters). **You CANNOT use \\\`<img>\\\` tags for these elements OR use the source \\\`photoDataUri\\\`**.
11. **Color Accuracy:** Use exact hex/RGB/HSL values.
12. **Responsiveness (If Implied):** Match the image's layout.
13. **NO EMBEDDING of Source Image Data in CSS \\\`url()\\\`.** Use solid colors, CSS gradients, or \\\`https://placehold.co/WIDTHxHEIGHT.png\\\`.
14. **Continuation Marker:** If the full HTML/CSS is too long for this single response, generate as much as you can and end your response *exactly* with the marker: \`${marker}\`. Do not include this marker if the content you are generating completes the webpage. If you include the marker, ensure the generated HTML chunk is valid up to that point.
`;

    if (input.previousContent) {
      promptSegments.push({text: `You are an expert web developer AI. You are continuing to generate a hyper-realistic, single-file HTML webpage from an image.
The previously generated content is:
\`\`\`html
${input.previousContent}
\`\`\`
Image for reference (same as initial):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `Continue generating the HTML and CSS from where the previous content left off.
Ensure the ENTIRE HTML document is eventually complete. Your goal is a 1:1, visually indistinguishable, pixel-perfect clone.
${commonInstructions}
Only output the new HTML/CSS chunk. Do not repeat the \`previousContent\`.`});
    } else {
      promptSegments.push({text: `You are an expert web developer AI specializing in converting images into **hyper-realistic, single-file HTML webpages**.
Your task is to analyze the provided image and generate an **exact 1:1, visually indistinguishable, pixel-perfect clone** of it as a complete HTML document.
The goal is to produce an HTML/CSS webpage that is **indistinguishable** from the source image down to the **smallest detail**. Every visual element, no matter how small or complex, MUST be replicated with extreme precision. Your output MUST be a single HTML string that, when rendered in a browser, is **indistinguishable** from the source image.

Image for reference:`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: commonInstructions});
    }
    
    const llmResponse = await ai.generate({
      prompt: promptSegments,
      config: {
        temperature: 0.1, 
        safetySettings: [ 
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ]
      },
    });

    let htmlChunk = llmResponse.text;
    
    if (htmlChunk === null || htmlChunk === undefined) {
      // If AI returns null/undefined, treat as an error or empty but complete chunk.
      // Depending on `previousContent`, this might be an error.
      if (input.previousContent) {
          // If continuing and get null, it's likely an issue.
          console.error("AI returned null/undefined during continuation.");
          return { htmlChunk: "", isComplete: false }; // Signal an issue, let action layer decide.
      }
      // For initial request, if null, means no content.
      return { htmlChunk: "", isComplete: true };
    }

    let isComplete = true;

    if (htmlChunk.trim().endsWith(marker)) {
      isComplete = false;
      htmlChunk = htmlChunk.substring(0, htmlChunk.lastIndexOf(marker)).trimEnd();
    }
    
    return { htmlChunk, isComplete };
  }
);
