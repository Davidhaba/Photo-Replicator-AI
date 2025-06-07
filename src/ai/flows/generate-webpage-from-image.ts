
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

// Drastically Simplified System Instructions
const systemInstructions = `
You are an expert AI web developer. Your primary task is to convert the provided image into a single, complete HTML document with embedded CSS.

**MANDATORY DIRECTIVES:**

1.  **Output Format:** Your entire response **MUST** be a single string containing a COMPLETE HTML document: \`<html><head><style>ALL CSS HERE</style></head><body>HTML CONTENT HERE</body></html>\`. **DO NOT WRAP THE HTML CODE IN MARKDOWN BACKTICKS OR ANY OTHER FORMATTING.**

2.  **CSS Styling:** ALL CSS styles required for visual replication (layout, colors, fonts, spacing, etc.) **MUST** be embedded DIRECTLY within the HTML using \`<style>\` tags in the \`<head>\`. You MAY link to public CDN web fonts (e.g., Google Fonts) if clearly identifiable in the image.

3.  **Visual Replication & Reconstruction:**
    *   Strive for accurate visual replication of the image's layout, colors, typography, and all distinct visual elements.
    *   Any non-textual visual elements (icons, logos, embedded photographs in the design, patterns, decorative shapes) **MUST be RECONSTRUCTED using ONLY HTML and CSS, or INLINE SVG within the HTML.**
    *   **ABSOLUTE PROHIBITION: DO NOT use \`<img>\` tags to embed rasterized versions of these UI elements from the original image.**
    *   **ABSOLUTE PROHIBITION: DO NOT embed the source image data (\`photoDataUri\`) in CSS \`url()\` or anywhere in the output HTML/CSS.** The source image is for your visual reference ONLY.

4.  **Static Output:** The generated webpage should be static. Avoid JavaScript unless absolutely essential for a critical visual effect.

5.  **Continuation Marker:** If the full HTML/CSS is too extensive for a single response, generate as much high-quality content as possible and end your response *EXACTLY* with the marker: \`${marker}\`. Do not include this marker if the content completes the webpage. Ensure the generated HTML chunk is valid up to that point.

6.  **Prioritize Accuracy:** If achieving accurate replication requires more verbose code or multiple continuation chunks, that is acceptable.
`;


const generateWebpagePrompt = ai.definePrompt(
  {
    name: 'generateWebpageWithSimplifiedSystemPrompt',
    system: systemInstructions, // Using the system field with simplified instructions
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
      promptSegments.push({text: `\n\nCONTINUATION (Attempt ${input.attemptNumber}):
You are resuming the generation of an HTML/CSS webpage.
The previously generated content, WHICH YOU MUST NOT REPEAT, is:
\`\`\`html
${input.previousContent}
\`\`\`
Image for reference (use this to ensure seamless continuation and overall accuracy):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `CRITICAL CONTINUATION DIRECTIVE: Continue generating the *NEXT CHUNK* of HTML and CSS from *EXACTLY* where the previous content left off.
DO NOT repeat any part of the \`previousContent\`.
Your response should ONLY be the NEW code that follows the \`previousContent\`.
If you are generating the final part, ensure the HTML document is properly closed.
If more content is needed, end your response with the marker: ${marker}
Adhere to ALL PREVIOUSLY STATED MANDATORY DIRECTIVES (from the system instructions).
Output ONLY the NEW HTML code. Do NOT use markdown code blocks.`});
    } else {
      promptSegments.push({text: `\n\nINITIAL GENERATION (Attempt 1):
Image for your analysis (this is your ONLY visual guide for REPLICATION):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `Apply your knowledge and ALL THE PREVIOUSLY STATED MANDATORY DIRECTIVES (from the system instructions) to transform the above image into a pixel-perfect HTML and CSS webpage.
Output ONLY the HTML code. Do NOT use markdown code blocks.
Strictly follow all directives.`});
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
      // Construct a detailed error message if the prompt execution itself fails
      let reason = "PROMPT_EXECUTION_ERROR";
      let message = "Failed to execute the prompt to the AI model.";
      if (e.name) reason = e.name;
      if (e.message) message = e.message;
      
      // Check if the error object has more specific Genkit/Gemini error details
      if (e.cause && typeof e.cause === 'object') {
        const cause = e.cause as any;
        if (cause.finishReason) reason = `PROMPT_EXECUTION_FAILURE: ${cause.finishReason}`;
        if (cause.finishMessage) message = cause.finishMessage;
      }

      return {
        htmlChunk: "",
        isComplete: true,
        finishReasonStr: reason,
        finishMessageStr: message,
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

    try {
      htmlChunkResult = llmResponse.text() ?? "";
    } catch (textError: any) {
      console.error(`Error accessing llmResponse.text() (attempt ${input.attemptNumber}):`, textError.message, textError.stack);
      htmlChunkResult = ""; 
      finishReason = 'TEXT_ACCESS_ERROR';
      finishMessage = `Error extracting text from AI response: ${textError.message}. This might happen if the AI response is malformed or blocked.`;
    }

    try {
      if (llmResponse.candidates && llmResponse.candidates.length > 0 && llmResponse.candidates[0]) {
        const rawCandidate = llmResponse.candidates[0];
        if (finishReason === undefined) finishReason = rawCandidate.finishReason; // Only set if not already set by textError
        if (finishMessage === undefined) finishMessage = rawCandidate.finishMessage; // Only set if not already set by textError
      } else {
        console.warn(`llmResponse.candidates is empty or undefined (attempt ${input.attemptNumber}).`);
        if (!htmlChunkResult && finishReason === undefined) { 
            finishReason = 'NO_CANDIDATES';
            finishMessage = 'AI model returned no candidates and no text.';
        }
      }
    } catch (candidateError: any) {
       console.error(`Error accessing llmResponse.candidates (attempt ${input.attemptNumber}):`, candidateError.message, candidateError.stack);
       if (finishReason === undefined) { 
          finishReason = 'CANDIDATE_ACCESS_ERROR';
          finishMessage = `Error processing AI candidates: ${candidateError.message}`;
       }
    }
    
    // Remove markdown code blocks if present
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
    const finishReasonStrForCheck = typeof finishReason === 'string' ? finishReason.toUpperCase() : (finishReason?.toString().toUpperCase() ?? '');


    if (finishReasonStrForCheck === 'MAX_TOKENS' || finishReasonStrForCheck === 'OTHER' || finishReasonStrForCheck === 'SAFETY' || finishReasonStrForCheck === 'RECITATION' || finishReasonStrForCheck === 'UNKNOWN') {
        isActuallyComplete = false;
    } else if (userMarkerFound) { 
        isActuallyComplete = false;
    }


    // If the AI returns an empty chunk but indicates it's not complete (e.g. due to MAX_TOKENS or SAFETY),
    // and it's not the first attempt, we might be stuck.
    // However, if it's the *first* attempt and the chunk is empty, the action.ts should handle it.
    // If it's a subsequent attempt and the chunk is empty but model says "not complete", we should probably mark complete to avoid infinite loop.
    if ((!htmlChunkResult || htmlChunkResult.trim() === "") && !isActuallyComplete) {
        if (input.attemptNumber && input.attemptNumber > 1 ) { // Only for subsequent attempts
             console.warn(`AI returned empty chunk during continuation (attempt ${input.attemptNumber}, reason: ${finishReasonStrForCheck || 'N/A'}, message: ${finishMessage || 'N/A'}) but indicated incompleteness. Forcing completion as a safeguard.`);
             isActuallyComplete = true; 
        }
        // For attempt 1, action.ts will handle the error message if htmlChunk is empty.
    }
    
    // If we decided it's complete, but the marker is still there (e.g. from a previous partial generation that got cut by MAX_TOKENS)
    if (isActuallyComplete && htmlChunkResult.includes(marker)) {
        htmlChunkResult = htmlChunkResult.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'g'), "").trimEnd();
    }

    return { 
      htmlChunk: htmlChunkResult, 
      isComplete: isActuallyComplete,
      finishReasonStr: typeof finishReason === 'string' ? finishReason : (finishReason?.toString() ?? undefined), 
      finishMessageStr: finishMessage
    };
  }
);
