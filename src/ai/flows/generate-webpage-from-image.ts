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

    const commonInstructions = `
You are a world-class, hyper-specialized AI web development agent, a master of HTML and CSS. Your sole mission, of paramount importance, is to transform the provided image into a flawless, production-ready HTML/CSS webpage. The standard for success is nothing less than a visually indistinguishable, pixel-perfect replica. The final rendered webpage must be a **pixel-for-pixel perfect replica** of the source image, so much so that it would be impossible to tell the difference.

**MANDATORY DIRECTIVES (DEVIATION IS CATASTROPHIC AND WILL RESULT IN MISSION FAILURE):**

1.  **Output Format (ABSOLUTE):** The output MUST be a single string containing a COMPLETE HTML document: \`<html>\`, \`<head>\` (with \`<style>\` tags), and \`<body>\`. Do NOT wrap the HTML code in markdown backticks like \`\`\`html ... \`\`\`.
2.  **CSS Styling (PRECISION REQUIRED):**
    *   **Embedded CSS ONLY (PRIMARY METHOD):** ALL CSS styles required for this **PERFECT VISUAL REPLICA** (layout, colors, fonts, spacing, borders, shadows, gradients, ALL graphical elements, intricate patterns, textual content) MUST be embedded DIRECTLY within the HTML using \`<style>\` tags in the \`<head>\` or inline styles. **ABSOLUTELY NO EXTERNAL CSS FILES. NO LINKED STYLESHEETS for general page styling.**
    *   **Web Fonts (Permitted if Necessary):** If the design prominently features a specific, identifiable font from a public CDN (e.g., Google Fonts, Adobe Fonts), you MAY include the necessary \`<link>\` tag in the \`<head>\` to import that font. For example: \`<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">\`. Use this sparingly and only for fonts crucial to visual fidelity.
3.  **UNCOMPROMISING, METICULOUS, FORENSIC-LEVEL DETAIL REPLICATION (PIXEL-PERFECT OR FAIL):** Your ultimate, singular goal is a **pixel-for-pixel, visually INDISTINGUISHABLE clone**. Achieve **PERFECT, FLAWLESS visual accuracy**. Pay **OBSESSIVE, ALMOST SUPERHUMAN attention** to the precise positioning, dimensions, colors, font styles, spacing, borders, shadows, gradients, and **EVERY SINGLE VISUAL ATTRIBUTE** present in the image. **ABSOLUTELY NO DETAIL IS TOO SMALL TO BE IGNORED. DO NOT SIMPLIFY, APPROXIMATE, OR OMIT ANY VISUAL ELEMENT OR ATTRIBUTE IF IT COMPROMISES THE PIXEL-PERFECT VISUAL FIDELITY.**
    **Subtle Enhancements (Optional, with Extreme Caution):** While the primary objective is an exact replica, if you identify an opportunity to subtly enhance the visual appeal or user experience (e.g., slightly refining a shadow for better depth, ensuring perfect font anti-aliasing, or improving a gradient for smoother transition) *without deviating from the core design, spirit, and layout of the original image*, you may apply such minor, tasteful improvements. **These enhancements must be virtually unnoticeable as deviations and should only serve to make the replica even more polished and professional. If in doubt, prioritize exact replication.**
4.  **Text Replication (PERFECTION REQUIRED):** If the image contains text, replicate it with **ABSOLUTE PRECISION** regarding font family (use linked web fonts if identified and necessary, otherwise closest web-safe match), size, weight, color, alignment, and placement.
5.  **Structural and Visual Integrity (FLAWLESS):** Recreate the structural layout, color palette, and ALL key visual elements from the image with the **HIGHEST POSSIBLE FIDELITY**.
6.  **ITERATIVE SELF-CORRECTION PROTOCOL (NON-NEGOTIABLE):**
    Your generation process for EACH and EVERY part of this webpage MUST follow a strict iterative self-correction loop:
        a. **Analyze Source Image Segment:** Focus on a specific portion of the source image.
        b. **Generate Initial Code:** Write the HTML and CSS to replicate that segment.
        c. **MENTAL/INTERNAL VISUALIZATION & COMPARISON:** CRITICALLY, you MUST then mentally (or through any internal mechanism available to you) visualize how your generated code would render. Compare this mental rendering, PIXEL BY PIXEL, against the actual source image segment.
        d. **Identify Discrepancies:** Pinpoint EVERY SINGLE deviation.
        e. **Refine and Regenerate:** Modify your HTML/CSS to correct ALL identified discrepancies.
        f. **Repeat Comparison (c-e):** Go back to step (c) with your refined code. Repeat this internal "generate-render-compare-refine" cycle relentlessly for the current segment UNTIL your generated code, when mentally visualized, is an ABSOLUTELY INDISTINGUISHABLE, PIXEL-PERFECT MATCH for the source image segment.
        g. **Proceed to Next Segment:** Only when a segment is PERFECT according to this protocol, move to the next part of the image.
    This iterative self-correction is NOT optional. It is the CORE of this mission.
7.  **Static Output (PRIMARILY):** The generated webpage should be static. Do not include JavaScript unless it is the *ONLY* way to achieve a specific visual effect crucial to the replication.
8.  **Valid and Clean Code:** Ensure the HTML is well-formed and valid.
9.  **HTML Only (NO MARKDOWN):** Return **ONLY** the HTML code. No introductory text, no explanations, just the code. **DO NOT wrap the HTML code in markdown backticks like \`\`\`html ... \`\`\` under any circumstances.**
10. **Placeholder Text (STRICTLY LIMITED):** Use placeholder text (e.g., "Lorem ipsum...") ONLY if the text in the image is **UTTERLY ILLEGIBLE AND CANNOT BE REASONABLY INFERRED**.
11. **RECONSTRUCTION OF VISUALS vs. REFERENCING CONTENT IMAGES (CRITICAL DISTINCTION):**
    *   **UI Elements (Recreate):** Any non-textual visual elements that are part of the **UI design itself** (e.g., icons, logos that function as UI elements, complex background patterns, decorative shapes, QR-codes integral to the UI function) **MUST be FLAWLESSLY and PIXEL-PERFECTLY RECONSTRUCTED using ONLY HTML and CSS, or INLINE SVG within the HTML.** This demands advanced CSS (e.g., complex gradients, \`clip-path\`, \`mask-image\`, pseudo-elements, filters) and potentially meticulous SVG path data. **YOU CANNOT USE \`<img>\` TAGS TO EMBED RASTERIZED VERSIONS OF THESE UI ELEMENTS FROM THE ORIGINAL IMAGE OR THE SOURCE \`photoDataUri\`**. For icons, prefer recreating with CSS/SVG or using inline SVG representations (e.g., similar to Lucide Icons).
    *   **Content Images (Reference with Placeholders):** If the source image clearly depicts a webpage that *itself embeds distinct image files as content* (e.g., photographs, user-uploaded pictures, product images, complex logos that are clearly pre-existing image assets on the original site and not simple UI shapes), you **MAY** use \`<img>\` tags to represent these.
        *   The \`src\` attribute for these \`<img>\` tags **MUST** be a generic placeholder: \`https://placehold.co/WIDTHxHEIGHT.png\` (replace WIDTH and HEIGHT with the inferred dimensions).
        *   Each such \`<img>\` tag **MUST** include a \`data-ai-hint="keywords"\` attribute describing the image content (e.g., \`data-ai-hint="logo companyX"\`, \`data-ai-hint="portrait smiling person"\`, \`data-ai-hint="red sports car"\`). Use 1-2 descriptive keywords.
        *   **DO NOT attempt to extract image data from the provided \`photoDataUri\` for use in these \`<img>\` tags.**
12. **Color Accuracy (EXACT VALUES):** Use EXACT hex/RGB/HSL values as extracted or inferred from the image for ALL colors.
13. **Responsiveness (IF AND ONLY IF IMPLIED):** Pay attention to responsiveness ONLY if the image itself clearly implies a specific responsive layout. If not specified, aim for a layout that EXACTLY matches the provided image's dimensions and aspect ratio.
14. **ABSOLUTE PROHIBITION: NO EMBEDDING OF SOURCE IMAGE DATA (\`photoDataUri\`) IN CSS \`url()\` OR ANYWHERE ELSE IN THE OUTPUT (Except for your analysis):** The source image provided via \`{{media url=photoDataUri}}\` is for YOUR VISUAL REFERENCE ONLY. It **MUST NOT, UNDER ANY CIRCUMSTANCES,** be embedded as a base64 string (or any other format) within CSS \`url()\` functions (e.g., as a \`background-image\` for any element) or used in \`<img>\` tags (unless following the placeholder rule in Directive #11). **ANY ATTEMPT TO INCLUDE THE ORIGINAL IMAGE DATA (BASE64 OR OTHERWISE) IN THE OUTPUT HTML/CSS (other than placeholders) IS A CRITICAL FAILURE.** If a background image is genuinely part of the design and cannot be recreated with CSS, use a SOLID COLOR, a CSS GRADIENT that mimics the original, or, AS A LAST RESORT for complex, unrenderable graphics, a generic placeholder like \`https://placehold.co/WIDTHxHEIGHT.png\` with a \`data-ai-hint\`.
15. **Continuation Marker (PRECISION REQUIRED):** If the full HTML/CSS is too long for this single response, generate as much as you can and end your response *EXACTLY* with the marker: \`${marker}\`. Do not include this marker if the content you are generating completes the webpage. If you include the marker, ensure the generated HTML chunk is valid up to that point.
16. **PRIORITY ON COMPLETENESS IF LIMITS ARE REACHED**: If you anticipate that generating every single minute detail with absolute pixel-perfection will exceed the response length limit, you MUST prioritize delivering a COMPLETE, valid HTML document structure (from \`<html>\` to \`</html>\`) with all major sections and elements present, even if some very minor visual details have to be slightly simplified to ensure the entire page is generated and not truncated. An untruncated, slightly less detailed page is VASTLY preferable to a truncated, pixel-perfect fragment. Ensure the \`${marker}\` is used if you are simplifying due to length and still cannot fit everything.
`;

    if (input.previousContent && input.attemptNumber && input.attemptNumber > 1) {
      promptSegments.push({text: `CONTINUATION OF CRITICAL MISSION (Attempt ${input.attemptNumber}):
You are resuming the generation of a pixel-perfect HTML/CSS webpage.
The previously generated content, which YOU MUST NOT REPEAT, is:
\`\`\`html
${input.previousContent}
\`\`\`
Image for reference (use this to ensure seamless continuation and overall accuracy):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `CRITICAL: Continue generating the *NEXT CHUNK* of HTML and CSS from *EXACTLY* where the previous content left off.
DO NOT repeat any part of the \`previousContent\`.
Your response should ONLY be the NEW code that follows the \`previousContent\`.
If you are generating the final part of the webpage, ensure the HTML document is properly closed (e.g., \`</body></html>\`).
If more content is needed, end your response with the marker: ${marker}
Adhere to ALL PREVIOUSLY STATED MANDATORY DIRECTIVES (especially regarding image handling and CSS).
Output ONLY the NEW HTML code. Do NOT use markdown code blocks. Make sure to strictly follow all directives, including the use of placeholders for content images (\`https://placehold.co/WIDTHxHEIGHT.png\` with \`data-ai-hint\`) and reconstruction of UI elements.`});
    } else {
      promptSegments.push({text: `CRITICAL MISSION START (Attempt 1):
You are a **hyper-specialized, professional AI web development agent**, a world-renowned master of HTML and CSS. Your mission, of paramount importance, is to convert the provided image into a **flawless, production-ready, and visually INDISTINGUISHABLE HTML/CSS webpage clone**.
The level of accuracy required is absolute: the final rendered webpage must be a **pixel-for-pixel perfect replica** of the source image, so much so that it would be impossible to tell the difference.
Occasionally, you may identify minor, subtle opportunities to enhance the visual presentation (e.g., a slightly smoother gradient, a more refined shadow) *without altering the original design's core elements or layout*. If such an enhancement makes the page even more polished and professional, you may apply it judiciously. However, **exact replication is paramount.**

Image for your meticulous analysis (this is your ONLY visual guide for REPLICATION):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `${commonInstructions}\nOutput ONLY the HTML code. Do NOT use markdown code blocks. Make sure to strictly follow all directives, including the use of placeholders for content images (\`https://placehold.co/WIDTHxHEIGHT.png\` with \`data-ai-hint\`) and reconstruction of UI elements.`});
    }

    const llmResponse = await ai.generate({
      prompt: promptSegments,
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
    });

    let htmlChunkResult = llmResponse.text ?? "";
    
    // More robust stripping of markdown code blocks and surrounding whitespace
    const markdownBlockRegex = new RegExp(/^```(?:html)?\s*([\s\S]*?)\s*```$/);
    let match = htmlChunkResult.trim().match(markdownBlockRegex);
    if (match && match[1]) {
      htmlChunkResult = match[1].trim();
    } else {
        // Fallback for cases where only one side of backticks might be present or no language specifier
        if (htmlChunkResult.startsWith("```html")) {
            htmlChunkResult = htmlChunkResult.substring(7).trimStart();
        } else if (htmlChunkResult.startsWith("```")) {
            htmlChunkResult = htmlChunkResult.substring(3).trimStart();
        }
        if (htmlChunkResult.endsWith("```")) {
            htmlChunkResult = htmlChunkResult.substring(0, htmlChunkResult.length - 3).trimEnd();
        }
        htmlChunkResult = htmlChunkResult.trim(); // Final trim
    }


    let userMarkerFound = false;
    if (htmlChunkResult.trim().endsWith(marker)) {
        userMarkerFound = true;
        // Remove the marker itself from the chunk
        htmlChunkResult = htmlChunkResult.substring(0, htmlChunkResult.lastIndexOf(marker)).trimEnd();
    }

    let isActuallyComplete = true;
    const candidate = llmResponse.candidates?.[0];

    // Check finishReason for MAX_TOKENS or if the model explicitly used the marker
    if (candidate?.finishReason === 'MAX_TOKENS' || candidate?.finishReason === 'OTHER') { 
        isActuallyComplete = false;
    } else if (userMarkerFound) {
        isActuallyComplete = false;
    }


    if ((!htmlChunkResult || htmlChunkResult.trim() === "") && !isActuallyComplete && input.previousContent) {
        // If it's a continuation and we get no new code but it's not marked complete,
        // it might be an LLM error or it genuinely thinks it's done but didn't remove the marker.
        // Assume it's complete to avoid infinite loops unless previous content was also minimal.
        console.warn("AI returned empty chunk during continuation but indicated incompleteness. Forcing completion if previous content was substantial, otherwise retrying once more could be an option.");
        isActuallyComplete = true; 
    }
    
    // Ensure that if it's marked complete, we don't have the marker
    if (isActuallyComplete && htmlChunkResult.includes(marker)) {
        htmlChunkResult = htmlChunkResult.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'g'), "").trimEnd();
    }


    return { htmlChunk: htmlChunkResult, isComplete: isActuallyComplete };
  }
);
