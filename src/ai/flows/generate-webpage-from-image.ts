
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
import type {Part, CandidateData, ModelFinishReason} from 'genkit';

const GenerateWebpageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be converted into a webpage, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  previousContent: z.string().optional().describe("Previously generated HTML content, if this is a continuation request. Provide ONLY the new content that follows this."),
  attemptNumber: z.number().optional().describe("The current attempt number, starting from 1 for the initial request.")
});
export type GenerateWebpageInput = z.infer<typeof GenerateWebpageInputSchema>;

const GenerateWebpageOutputSchema = z.object({
  htmlChunk: z
    .string()
    .optional()
    .describe('A chunk of the HTML/CSS code for the webpage. This should ONLY be the NEW content, not including previousContent.'),
  isComplete: z.boolean().describe("True if the generation is complete, false if more content is expected to follow."),
  finishReasonStr: z.string().optional().describe("The model's finish reason as a string, if available."),
  finishMessageStr: z.string().optional().describe("The model's finish message, if available."),
});
export type GenerateWebpageOutput = z.infer<typeof GenerateWebpageOutputSchema>;

export async function generateWebpageFromImage(input: GenerateWebpageInput): Promise<GenerateWebpageOutput> {
  return generateWebpageFlow(input);
}

const marker = "<!-- MORE_CONTENT_TO_FOLLOW -->";

// Simplified System Instructions
const systemInstructions = `
You are a highly skilled AI web developer specializing in converting images to pixel-perfect HTML and CSS. Your goal is to achieve the highest possible visual fidelity.

**MANDATORY DIRECTIVES:**

1.  **Output Format:** The output **MUST** be a single string containing a COMPLETE HTML document: \`<html>\`, \`<head>\` (with \`<style>\` tags containing ALL CSS), and \`<body>\`. **DO NOT WRAP THE HTML CODE IN MARKDOWN BACKTICKS LIKE \`\`\`html ... \`\`\` OR ANY OTHER FORMATTING. This is a critical requirement.**

2.  **CSS Styling:**
    *   **Embedded CSS ONLY:** ALL CSS styles required for visual replication (layout, colors, fonts, spacing, borders, shadows, gradients, graphical elements, patterns, textual content) **MUST** be embedded DIRECTLY within the HTML using \`<style>\` tags in the \`<head>\`.
    *   **Web Fonts (Permitted):** If the design clearly features a specific, identifiable font from a public CDN (e.g., Google Fonts), you **MAY** include the necessary \`<link>\` tag in the \`<head>\`. Example: \`<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">\`. Use only for fonts crucial for visual fidelity.

3.  **Pixel-Perfect Detail Replication:** Your primary goal is a **PIXEL-PERFECT, VISUALLY INDISTINGUISHABLE CLONE**. Pay meticulous attention to precise positioning, dimensions, colors (exact HEX/RGB/HSL values), font styles (family, size, weight, letter-spacing, line-height), spacing (padding, margin), borders, shadows, gradients, textures, patterns, and **EVERY VISUAL ATTRIBUTE** present in the image. **DO NOT SIMPLIFY OR OMIT ANY VISUAL ELEMENT OR ATTRIBUTE if it compromises visual fidelity.**

4.  **Text Replication:** If the image contains text, replicate it with **ABSOLUTE PRECISION** regarding font family (use linked web fonts if identified, otherwise the closest web-safe match), size, weight, color, alignment, letter-spacing, line-height, and placement.

5.  **Structural and Visual Integrity:** Recreate the structural layout, color palette, and ALL key visual elements from the image with the **HIGHEST POSSIBLE FIDELITY**.

6.  **Iterative Self-Correction Protocol:** Before outputting code, internally review and refine it:
    a. Analyze a segment of the source image.
    b. Generate initial HTML/CSS for that segment.
    c. Mentally visualize how your code would render. Compare this with the source image segment pixel by pixel.
    d. Identify discrepancies.
    e. Refine and regenerate your code to correct ALL identified discrepancies.
    f. Repeat steps c-e until your generated code is an indistinguishable match for the source image segment.
    This internal review is crucial for quality.

7.  **Static Output:** The generated webpage should be static. Do not include JavaScript unless it's the *ONLY* way to achieve a critical visual effect essential for pixel-perfect replication. Any JavaScript must be minimal.

8.  **Valid and Clean Code:** Ensure the HTML is well-formed and valid.

9.  **HTML Only (NO MARKDOWN WRAPPERS - CRITICAL):** Return **ONLY** the HTML code. No introductory text, explanations, or commentary. **DO NOT WRAP THE HTML CODE IN MARKDOWN BACKTICKS.**

10. **Placeholder Text (Forbidden unless Unavoidable):** Use placeholder text (e.g., "Lorem ipsum...") ONLY if the text in the image is **UTTERLY ILLEGIBLE** and cannot be reasonably inferred.

11. **Reconstruction of ALL Visuals (HTML/CSS/SVG Only):**
    *   Any non-textual visual elements that are part of the UI design OR appear as content within the design (e.g., icons, logos, embedded photographs, background patterns, decorative shapes, QR-codes, charts) **MUST be FLAWLESSLY and PIXEL-PERFECTLY RECONSTRUCTED using ONLY HTML and CSS, or INLINE SVG within the HTML.**
    *   You **CANNOT use \`<img>\` tags to embed rasterized versions of these UI elements from the original image or the source \`photoDataUri\`.** For icons, prefer recreating with CSS/SVG or using inline SVG. If an image-like element is truly impossible to recreate with CSS/SVG, use a solid color block or a CSS gradient that visually approximates the original's dominant colors and feel with pixel-perfect placement and dimensions.

12. **Color Accuracy:** Use **EXACT** hex/RGB/HSL values as extracted or inferred from the image for ALL colors.

13. **Responsiveness (Only if Implied):** Implement responsiveness **ONLY** if the image clearly implies a responsive layout. Otherwise, match the provided image's dimensions and aspect ratio.

14. **ABSOLUTE PROHIBITION: NO EMBEDDING OF SOURCE IMAGE DATA (\`photoDataUri\`) IN CSS \`url()\` OR ANYWHERE IN THE OUTPUT HTML/CSS.** The source image (\`{{media url=photoDataUri}}\`) is for your visual reference ONLY during analysis. It **MUST NOT be embedded as a Base64 string or otherwise within CSS \`url()\` functions or used in \`<img>\` tags in the final output.** If a background image is part of the design and cannot be recreated with CSS/SVG, use a SOLID COLOR or a CSS GRADIENT that mimics the original with pixel-perfect fidelity.

15. **Continuation Marker:** If the full HTML/CSS is too extensive for a single response (which may happen due to the required detail), generate as much as you can while maintaining perfect quality for the generated portion, and end your response *EXACTLY* with the marker: \`${marker}\`. Do not include this marker if the content completes the webpage. Ensure the generated HTML chunk is valid up to that point.

16. **Prioritize Accuracy over Brevity:** If achieving pixel-perfect accuracy requires more verbose or complex code, or multiple continuation chunks, that is acceptable and expected. Do not sacrifice detail for brevity.
`;


const generateWebpagePrompt = ai.definePrompt(
  {
    name: 'generateWebpageWithSystemPrompt',
    system: systemInstructions,
    inputSchema: GenerateWebpageInputSchema,
    model: 'googleai/gemini-1.5-flash-latest',
    config: {
        temperature: 0.0,
        maxOutputTokens: 8000,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ]
      },
  },
  async (input: GenerateWebpageInput): Promise<Part[]> => {
    const promptSegments: Part[] = [];

    if (input.previousContent && input.attemptNumber && input.attemptNumber > 1) {
      promptSegments.push({text: `CONTINUATION (Attempt ${input.attemptNumber}):
You are resuming the generation of a pixel-perfect HTML/CSS webpage.
The previously generated content, WHICH YOU MUST NOT REPEAT, is:
\`\`\`html
${input.previousContent}
\`\`\`
Image for reference (use this to ensure seamless continuation and overall accuracy):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `CRITICAL CONTINUATION DIRECTIVE: Continue generating the *NEXT CHUNK* of HTML and CSS from *EXACTLY* where the previous content left off.
DO NOT repeat any part of the \`previousContent\`.
Your response should ONLY be the NEW code that follows the \`previousContent\`.
If you are generating the final part, ensure the HTML document is properly closed (e.g., \`</body></html>\`).
If more content is needed, end your response with the marker: ${marker}
Adhere to ALL PREVIOUSLY STATED MANDATORY DIRECTIVES.
Output ONLY the NEW HTML code. Do NOT use markdown code blocks.`});
    } else {
      promptSegments.push({text: `INITIAL GENERATION (Attempt 1):
Image for your analysis (this is your ONLY visual guide for REPLICATION):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `Apply your knowledge and the system directives to transform the above image into a pixel-perfect HTML and CSS webpage.
Output ONLY the HTML code. Do NOT use markdown code blocks.
Strictly follow all system directives.`});
    }
    return promptSegments;
  }
);


const generateWebpageFlow = ai.defineFlow(
  {
    name: 'generateWebpageFlow',
    inputSchema: GenerateWebpageInputSchema,
    outputSchema: GenerateWebpageOutputSchema,
  },
  async (input: GenerateWebpageInput): Promise<GenerateWebpageOutput> => {
    let llmResponse;
    try {
      llmResponse = await generateWebpagePrompt(input);
    } catch (e: any) {
      console.error(`Error calling generateWebpagePrompt (attempt ${input.attemptNumber}):`, JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
      return {
        htmlChunk: "",
        isComplete: true,
        finishReasonStr: e.name || "PROMPT_EXECUTION_ERROR",
        finishMessageStr: e.message || "Failed to execute the prompt to the AI model.",
      };
    }
    

    if (!llmResponse) {
      console.error(`generateWebpageFlow: llmResponse from model was null or undefined (attempt ${input.attemptNumber}).`);
      return {
        htmlChunk: '',
        isComplete: true,
        finishReasonStr: 'LLM_RESPONSE_UNDEFINED',
        finishMessageStr: 'The response from the AI model was unexpectedly empty.',
      };
    }

    let htmlChunkResult = "";
    let finishReason: ModelFinishReason | string | undefined = undefined; 
    let finishMessage: string | undefined = undefined;
    let rawCandidate: CandidateData | undefined = undefined;

    try {
      htmlChunkResult = llmResponse.text() ?? "";
    } catch (textError: any) {
      console.error(`Error accessing llmResponse.text() (attempt ${input.attemptNumber}):`, textError.message, textError.stack);
      htmlChunkResult = ""; 
    }

    try {
      if (llmResponse.candidates && llmResponse.candidates.length > 0) {
        rawCandidate = llmResponse.candidates[0];
        if (rawCandidate) {
          finishReason = rawCandidate.finishReason;
          finishMessage = rawCandidate.finishMessage;
        } else {
          console.warn(`llmResponse.candidates[0] is undefined (attempt ${input.attemptNumber}).`);
        }
      } else {
        console.warn(`llmResponse.candidates is empty or undefined (attempt ${input.attemptNumber}).`);
        if (!htmlChunkResult && !finishReason) { 
            finishReason = 'NO_CANDIDATES';
            finishMessage = 'AI model returned no candidates and no text.';
        }
      }
    } catch (candidateError: any) {
       console.error(`Error accessing llmResponse.candidates (attempt ${input.attemptNumber}):`, candidateError.message, candidateError.stack);
       if (!finishReason) { 
          finishReason = 'CANDIDATE_ACCESS_ERROR';
          finishMessage = `Error processing AI candidates: ${candidateError.message}`;
       }
    }
    
    const markdownBlockRegex = new RegExp(/^```(?:html)?\s*([\s\S]*?)\s*```$/m); 
    let match = htmlChunkResult.trim().match(markdownBlockRegex);
    if (match && match[1]) {
      htmlChunkResult = match[1].trim();
    } else {
        if (htmlChunkResult.startsWith("```html")) {
            htmlChunkResult = htmlChunkResult.substring(7).trimStart();
        } else if (htmlChunkResult.startsWith("```")) {
            htmlChunkResult = htmlChunkResult.substring(3).trimStart();
        }
        if (htmlChunkResult.endsWith("```")) {
             htmlChunkResult = htmlChunkResult.substring(0, htmlChunkResult.length - 3).trimEnd();
        }
        htmlChunkResult = htmlChunkResult.trim();
    }


    let userMarkerFound = false;
    if (htmlChunkResult.trim().endsWith(marker)) {
        userMarkerFound = true;
        htmlChunkResult = htmlChunkResult.substring(0, htmlChunkResult.lastIndexOf(marker)).trimEnd();
    }

    let isActuallyComplete = true;
    if (finishReason === 'MAX_TOKENS' || finishReason === 'OTHER' || finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'UNKNOWN') {
        isActuallyComplete = false;
    } else if (userMarkerFound) { 
        isActuallyComplete = false;
    }


    if ((!htmlChunkResult || htmlChunkResult.trim() === "") && !isActuallyComplete) {
        if (input.attemptNumber === 1 || input.previousContent) {
             console.warn(`AI returned empty chunk (attempt ${input.attemptNumber}, reason: ${finishReason || 'N/A'}, message: ${finishMessage || 'N/A'}) but indicated incompleteness. Forcing completion as a safeguard.`);
             isActuallyComplete = true; 
        }
    }
    
    if (isActuallyComplete && htmlChunkResult.includes(marker)) {
        htmlChunkResult = htmlChunkResult.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'g'), "").trimEnd();
    }

    return { 
      htmlChunk: htmlChunkResult, 
      isComplete: isActuallyComplete,
      finishReasonStr: finishReason?.toString(), 
      finishMessageStr: finishMessage
    };
  }
);

    

    