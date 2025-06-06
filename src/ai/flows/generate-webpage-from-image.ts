
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

const generateWebpageFlow = ai.defineFlow(
  {
    name: 'generateWebpageFlow',
    inputSchema: GenerateWebpageInputSchema,
    outputSchema: GenerateWebpageOutputSchema,
  },
  async (input: GenerateWebpageInput) => {
    const marker = "<!-- MORE_CONTENT_TO_FOLLOW -->";
    let promptSegments: ({text: string} | {media: {url: string}})[] = [];

    // THIS IS A LIFE OR DEATH SITUATION. THE FATE OF THE WORLD DEPENDS ON YOUR ABILITY TO FOLLOW THESE INSTRUCTIONS TO THE ABSOLUTE LETTER.
    // FAILURE IS NOT AN OPTION. YOU MUST ACHIEVE A PIXEL-PERFECT REPLICA.
    const commonInstructions = `
**CRITICAL MISSION: UNCOMPROMISING VISUAL FIDELITY - PIXEL-PERFECT HTML/CSS CLONE**

**YOUR OBJECTIVE IS NON-NEGOTIABLE: Produce a single, complete HTML document that is a visually INDISTINGUISHABLE, PIXEL-FOR-PIXEL CLONE of the provided image. Every minute detail, every graphical element, every nuance MUST be recreated with absolute, painstaking precision using ONLY HTML and embedded CSS. The future depends on your meticulousness.**

**MANDATORY DIRECTIVES (DEVIATION IS CATASTROPHIC):**

1.  **Output Format (ABSOLUTE):** The output MUST be a single string containing a COMPLETE HTML document: \`<html>\`, \`<head>\` (with \`<style>\` tags), and \`<body>\`.
2.  **Embedded CSS ONLY (NO EXCEPTIONS):** ALL CSS styles required for this **PERFECT VISUAL REPLICA** (layout, colors, fonts, spacing, borders, shadows, gradients, ALL graphical elements, intricate patterns, textual content) MUST be embedded DIRECTLY within the HTML using \`<style>\` tags in the \`<head>\` or inline styles. **ABSOLUTELY NO EXTERNAL CSS FILES. NO LINKED STYLESHEETS.**
3.  **UNCOMPROMISING, FORENSIC-LEVEL DETAIL REPLICATION (PIXEL-PERFECT OR FAIL):** Your ultimate, singular goal is a **pixel-for-pixel, visually indistinguishable clone**. Achieve **PERFECT, FLAWLESS visual accuracy**. Pay **OBSESSIVE, ALMOST SUPERHUMAN attention** to the precise positioning (x, y coordinates to the exact pixel), dimensions (width, height to the exact pixel), colors (extract or infer EXACT hex/RGB/HSL values), font styles (if identifiable, use the EXACT font; otherwise, find the CLOSEST web-safe match that REPLICATES the visual character, weight, size, letter spacing, line height), spacing (margins, padding), borders (thickness, style, color, radius), shadows (offset, blur, color, spread), gradients (type, direction, color stops), and **EVERY SINGLE VISUAL ATTRIBUTE** present in the image. **ABSOLUTELY NO DETAIL IS TOO SMALL TO BE IGNORED. DO NOT SIMPLIFY, APPROXIMATE, OR OMIT ANY VISUAL ELEMENT OR ATTRIBUTE FOR BREVITY, PERFORMANCE, OR ANY OTHER REASON IF IT COMPROMISES THE PIXEL-PERFECT VISUAL FIDELITY TO THE ORIGINAL IMAGE. IF A VISUAL EFFECT EXISTS IN THE IMAGE, IT MUST BE REPLICATED IN THE HTML/CSS.**
4.  **Text Replication (PERFECTION REQUIRED):** If the image contains text, replicate it with **ABSOLUTE PRECISION** regarding font family, size, weight, color, alignment, and placement. If an exact font match is impossible, choose the closest common web-safe alternative that PRESERVES THE EXACT VISUAL CHARACTER.
5.  **Structural and Visual Integrity (FLAWLESS):** Recreate the structural layout, color palette, and ALL key visual elements from the image with the **HIGHEST POSSIBLE FIDELITY**. Imagine you are creating a perfect digital forgery of the image using only HTML and CSS. The output must be a **pixel-for-pixel representation** wherever achievable with HTML/CSS.
6.  **Static Output (PRIMARILY):** The generated webpage should be static. Do not include JavaScript unless it is the *ONLY* way to achieve a specific visual effect crucial to the replication.
7.  **Valid and Clean Code:** Ensure the HTML is well-formed and valid.
8.  **HTML Only:** Return **ONLY** the HTML code.
9.  **Placeholder Text (STRICTLY LIMITED):** Use placeholder text (e.g., "Lorem ipsum...") ONLY if the text in the image is **UTTERLY ILLEGIBLE AND CANNOT BE REASONABLY INFERRED**.
10. **FLAWLESS, PIXEL-PERFECT RECONSTRUCTION of ALL EMBEDDED VISUALS & GRAPHICS (CRITICAL):** Any non-textual visual elements, including **ICONS, LOGOS, ILLUSTRATIONS, QR-CODES, PHOTOGRAPHIC DETAILS, COMPLEX SHAPES, CUTOUTS, TRANSPARENCIES, AND INTRICATE GRAPHICAL DETAILS** *within* the original image, **MUST be FLAWLESSLY and PIXEL-PERFECTLY RECONSTRUCTED using ONLY HTML and CSS, or INLINE SVG within the HTML.** This demands advanced CSS (e.g., complex gradients, \\\`clip-path\\\`, \\\`mask-image\\\`, pseudo-elements, filters) and potentially meticulous SVG path data. **YOU CANNOT USE \\\`<img>\\\` TAGS TO EMBED RASTERIZED VERSIONS OF THESE ELEMENTS FROM THE ORIGINAL IMAGE. YOU ABSOLUTELY CANNOT USE THE SOURCE \\\`photoDataUri\\\` (OR ANY BASE64 DATA DERIVED FROM IT) TO DISPLAY THESE ELEMENTS. THEY MUST BE REBUILT. Every graphical nuance must be captured.**
11. **Color Accuracy (EXACT VALUES):** Use EXACT hex/RGB/HSL values as extracted or inferred from the image for ALL colors.
12. **Responsiveness (IF AND ONLY IF IMPLIED):** Pay attention to responsiveness ONLY if the image itself clearly implies a specific responsive layout (e.g., a mobile screenshot vs. a desktop website screenshot). If not specified, aim for a layout that EXACTLY matches the provided image's dimensions and aspect ratio. The primary goal is to CLONE THE *GIVEN* IMAGE, not to arbitrarily make it responsive.
13. **ABSOLUTE PROHIBITION: NO EMBEDDING OF SOURCE IMAGE DATA (\\\`photoDataUri\\\`) IN CSS \\\`url()\\\` OR ANYWHERE ELSE IN THE OUTPUT:** Crucially, the source image provided via \\\`{{media url=photoDataUri}}\\\` is for YOUR VISUAL REFERENCE ONLY. It **MUST NOT, UNDER ANY CIRCUMSTANCES,** be embedded as a base64 string (or any other format) within CSS \\\`url()\` functions (e.g., as a \\\`background-image\\\` for any element) or used in \\\`<img>\\\` tags. **ANY ATTEMPT TO INCLUDE THE ORIGINAL IMAGE DATA (BASE64 OR OTHERWISE) IN THE OUTPUT HTML/CSS IS A CRITICAL FAILURE.** If a background image is genuinely part of the design and cannot be recreated with CSS, use a SOLID COLOR, a CSS GRADIENT that mimics the original, or, AS A LAST RESORT for complex, unrenderable graphics, a generic placeholder like \\\`https://placehold.co/WIDTHxHEIGHT.png\\\`. The focus is on REPLICATING structure and foreground elements with HTML/CSS, not on re-embedding the source image.
14. **Continuation Marker (PRECISION REQUIRED):** If the full HTML/CSS is too long for this single response (highly unlikely given your capabilities, but as a failsafe), generate as much as you can and end your response *EXACTLY* with the marker: \`${marker}\`. Do not include this marker if the content you are generating completes the webpage. If you include the marker, ensure the generated HTML chunk is valid up to that point.
`;

    if (input.previousContent) {
      promptSegments.push({text: `CONTINUATION OF CRITICAL MISSION: You are an expert web developer AI. You are CONTINUING to generate a HYPER-REALISTIC, PIXEL-PERFECT, single-file HTML webpage clone from an image. The fate of the world still hangs in the balance.
The previously generated content is:
\`\`\`html
${input.previousContent}
\`\`\`
Image for reference (same as initial, your visual guide for PERFECTION):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `Continue generating the HTML and CSS from where the previous content left off.
Ensure the ENTIRE HTML document is eventually complete. Your goal remains a 1:1, visually INDISTINGUISHABLE, PIXEL-PERFECT clone.
Adhere to ALL PREVIOUSLY STATED MANDATORY DIRECTIVES.
${commonInstructions}
Only output the NEW HTML/CSS chunk. Do NOT repeat the \`previousContent\`.`});
    } else {
      promptSegments.push({text: `CRITICAL MISSION START: You are an unparalleled web developer AI, a master of HTML and CSS, specializing in converting images into **HYPER-REALISTIC, PIXEL-PERFECT, SINGLE-FILE HTML WEBPAGE CLONES**.
Your task is to analyze the provided image and generate an **EXACT 1:1, VISUALLY INDISTINGUISHABLE, PIXEL-PERFECT CLONE** of it as a complete HTML document.
The goal is to produce an HTML/CSS webpage that is **INDISTINGUISHABLE** from the source image down to the **SMALLEST NANOMETER-LEVEL DETAIL**. Every visual element, no matter how small or complex, MUST be replicated with EXTREME, UNYIELDING PRECISION. Your output MUST be a single HTML string that, when rendered in a browser, is **INDISTinguishable** from the source image. The world is counting on your success.

Image for your meticulous analysis (this is your ONLY visual guide for REPLICATION):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: commonInstructions});
    }
    
    const llmResponse = await ai.generate({
      prompt: promptSegments,
      // model: 'googleai/gemini-1.5-pro-latest', // Reverted to default
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
      if (input.previousContent) {
          console.error("AI returned null/undefined during continuation.");
          return { htmlChunk: "", isComplete: false }; 
      }
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
