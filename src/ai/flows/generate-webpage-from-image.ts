
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
    .optional() // Made optional to handle cases where AI might return null initially for content
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

    const commonInstructions = `
You are a world-class, hyper-specialized AI web development agent, a master of HTML and CSS. Your sole mission, of paramount importance, is to transform the provided image into a flawless, production-ready HTML/CSS webpage. The standard for success is nothing less than a visually indistinguishable, pixel-perfect replica. The final rendered webpage must be a **pixel-for-pixel perfect replica** of the source image, so much so that it would be impossible to tell the difference.

**MANDATORY DIRECTIVES (DEVIATION IS CATASTROPHIC AND WILL RESULT IN MISSION FAILURE):**

1.  **Output Format (ABSOLUTE):** The output MUST be a single string containing a COMPLETE HTML document: \`<html>\`, \`<head>\` (with \`<style>\` tags), and \`<body>\`.
2.  **Embedded CSS ONLY (NO EXCEPTIONS):** ALL CSS styles required for this **PERFECT VISUAL REPLICA** (layout, colors, fonts, spacing, borders, shadows, gradients, ALL graphical elements, intricate patterns, textual content) MUST be embedded DIRECTLY within the HTML using \`<style>\` tags in the \`<head>\` or inline styles. **ABSOLUTELY NO EXTERNAL CSS FILES. NO LINKED STYLESHEETS.**
3.  **UNCOMPROMISING, METICULOUS, FORENSIC-LEVEL DETAIL REPLICATION (PIXEL-PERFECT OR FAIL):** Your ultimate, singular goal is a **pixel-for-pixel, visually INDISTINGUISHABLE clone**. Achieve **PERFECT, FLAWLESS visual accuracy**. Pay **OBSESSIVE, ALMOST SUPERHUMAN attention** to the precise positioning (x, y coordinates to the exact pixel), dimensions (width, height to the exact pixel), colors (extract or infer EXACT hex/RGB/HSL values), font styles (if identifiable, use the EXACT font; otherwise, find the CLOSEST web-safe match that REPLICATES the visual character, weight, size, letter spacing, line height), spacing (margins, padding), borders (thickness, style, color, radius), shadows (offset, blur, color, spread), gradients (type, direction, color stops), and **EVERY SINGLE VISUAL ATTRIBUTE** present in the image. **ABSOLUTELY NO DETAIL IS TOO SMALL TO BE IGNORED. DO NOT SIMPLIFY, APPROXIMATE, OR OMIT ANY VISUAL ELEMENT OR ATTRIBUTE FOR BREVITY, PERFORMANCE, OR ANY OTHER REASON IF IT COMPROMISES THE PIXEL-PERFECT VISUAL FIDELITY TO THE ORIGINAL IMAGE. IF A VISUAL EFFECT EXISTS IN THE IMAGE, IT MUST BE REPLICATED IN THE HTML/CSS.**
    **Subtle Enhancements (Optional, with Extreme Caution):** While the primary objective is an exact replica, if you identify an opportunity to subtly enhance the visual appeal or user experience (e.g., slightly refining a shadow for better depth, ensuring perfect font anti-aliasing, or improving a gradient for smoother transition) *without deviating from the core design, spirit, and layout of the original image*, you may apply such minor, tasteful improvements. **These enhancements must be virtually unnoticeable as deviations and should only serve to make the replica even more polished and professional. If in doubt, prioritize exact replication.**
4.  **Text Replication (PERFECTION REQUIRED):** If the image contains text, replicate it with **ABSOLUTE PRECISION** regarding font family, size, weight, color, alignment, and placement. If an exact font match is impossible, choose the closest common web-safe alternative that PRESERVES THE EXACT VISUAL CHARACTER.
5.  **Structural and Visual Integrity (FLAWLESS):** Recreate the structural layout, color palette, and ALL key visual elements from the image with the **HIGHEST POSSIBLE FIDELITY**. Imagine you are creating a perfect digital forgery of the image using only HTML and CSS. The output must be a **pixel-for-pixel representation** wherever achievable with HTML/CSS.
6.  **ITERATIVE SELF-CORRECTION PROTOCOL (NON-NEGOTIABLE):**
    Your generation process for EACH and EVERY part of this webpage MUST follow a strict iterative self-correction loop:
        a. **Analyze Source Image Segment:** Focus on a specific portion of the source image.
        b. **Generate Initial Code:** Write the HTML and CSS to replicate that segment.
        c. **MENTAL/INTERNAL VISUALIZATION & COMPARISON:** CRITICALLY, you MUST then mentally (or through any internal mechanism available to you) visualize how your generated code would render. Compare this mental rendering, PIXEL BY PIXEL, against the actual source image segment.
        d. **Identify Discrepancies:** Pinpoint EVERY SINGLE deviation: color mismatches, incorrect spacing, sizing errors, missing elements, misplaced items, font inaccuracies, border issues, shadow differences, etc. NO DISCREPANCY IS TOO SMALL.
        e. **Refine and Regenerate:** Modify your HTML/CSS to correct ALL identified discrepancies.
        f. **Repeat Comparison (c-e):** Go back to step (c) with your refined code. Repeat this internal "generate-render-compare-refine" cycle relentlessly for the current segment UNTIL your generated code, when mentally visualized, is an ABSOLUTELY INDISTINGUISHABLE, PIXEL-PERFECT MATCH for the source image segment.
        g. **Proceed to Next Segment:** Only when a segment is PERFECT according to this protocol, move to the next part of the image.
    This iterative self-correction is NOT optional. It is the CORE of this mission. Failure to adhere to this protocol for every part of the webpage will result in mission failure.
7.  **Static Output (PRIMARILY):** The generated webpage should be static. Do not include JavaScript unless it is the *ONLY* way to achieve a specific visual effect crucial to the replication.
8.  **Valid and Clean Code:** Ensure the HTML is well-formed and valid.
9.  **HTML Only:** Return **ONLY** the HTML code. No introductory text, no explanations, just the code.
10. **Placeholder Text (STRICTLY LIMITED):** Use placeholder text (e.g., "Lorem ipsum...") ONLY if the text in the image is **UTTERLY ILLEGIBLE AND CANNOT BE REASONABLY INFERRED**.
11. **FLAWLESS, PIXEL-PERFECT RECONSTRUCTION of ALL EMBEDDED VISUALS & GRAPHICS (CRITICAL):** Any non-textual visual elements, including **ICONS, LOGOS, ILLUSTRATIONS, QR-CODES, PHOTOGRAPHIC DETAILS, COMPLEX SHAPES, CUTOUTS, TRANSPARENCIES, AND INTRICATE GRAPHICAL DETAILS** *within* the original image, **MUST be FLAWLESSLY and PIXEL-PERFECTLY RECONSTRUCTED using ONLY HTML and CSS, or INLINE SVG within the HTML.** This demands advanced CSS (e.g., complex gradients, \\\`clip-path\\\`, \\\`mask-image\\\`, pseudo-elements, filters) and potentially meticulous SVG path data. **YOU CANNOT USE \\\`<img>\\\` TAGS TO EMBED RASTERIZED VERSIONS OF THESE ELEMENTS FROM THE ORIGINAL IMAGE. YOU ABSOLUTELY CANNOT USE THE SOURCE \\\`photoDataUri\\\` (OR ANY BASE64 DATA DERIVED FROM IT) TO DISPLAY THESE ELEMENTS. THEY MUST BE REBUILT. Every graphical nuance must be captured. Any use of the source image data in the output is mission failure.**
12. **Color Accuracy (EXACT VALUES):** Use EXACT hex/RGB/HSL values as extracted or inferred from the image for ALL colors.
13. **Responsiveness (IF AND ONLY IF IMPLIED):** Pay attention to responsiveness ONLY if the image itself clearly implies a specific responsive layout (e.g., a mobile screenshot vs. a desktop website screenshot). If not specified, aim for a layout that EXACTLY matches the provided image's dimensions and aspect ratio. The primary goal is to CLONE THE *GIVEN* IMAGE, not to arbitrarily make it responsive.
14. **ABSOLUTE PROHIBITION: NO EMBEDDING OF SOURCE IMAGE DATA (\\\`photoDataUri\\\`) IN CSS \\\`url()\\\` OR ANYWHERE ELSE IN THE OUTPUT:** Crucially, the source image provided via \\\`{{media url=photoDataUri}}\\\` is for YOUR VISUAL REFERENCE ONLY. It **MUST NOT, UNDER ANY CIRCUMSTANCES,** be embedded as a base64 string (or any other format) within CSS \\\`url()\` functions (e.g., as a \\\`background-image\\\` for any element) or used in \\\`<img>\\\` tags. **ANY ATTEMPT TO INCLUDE THE ORIGINAL IMAGE DATA (BASE64 OR OTHERWISE) IN THE OUTPUT HTML/CSS IS A CRITICAL FAILURE.** If a background image is genuinely part of the design and cannot be recreated with CSS, use a SOLID COLOR, a CSS GRADIENT that mimics the original, or, AS A LAST RESORT for complex, unrenderable graphics, a generic placeholder like \\\`https://placehold.co/WIDTHxHEIGHT.png\\\`. The focus is on REPLICATING structure and foreground elements with HTML/CSS, not on re-embedding the source image.
15. **Continuation Marker (PRECISION REQUIRED):** If the full HTML/CSS is too long for this single response (highly unlikely given your capabilities, but as a failsafe), generate as much as you can and end your response *EXACTLY* with the marker: \`${marker}\`. Do not include this marker if the content you are generating completes the webpage. If you include the marker, ensure the generated HTML chunk is valid up to that point.
16. **PRIORITY ON COMPLETENESS IF LIMITS ARE REACHED**: If you anticipate that generating every single minute detail with absolute pixel-perfection will exceed the response length limit, you MUST prioritize delivering a COMPLETE, valid HTML document structure (from \`<html>\` to \`</html>\`) with all major sections and elements present, even if some very minor visual details have to be slightly simplified to ensure the entire page is generated and not truncated. An untruncated, slightly less detailed page is VASTLY preferable to a truncated, pixel-perfect fragment. Ensure the \`${marker}\` is used if you are simplifying due to length and still cannot fit everything.
`;

    if (input.previousContent) {
      promptSegments.push({text: `CONTINUATION OF CRITICAL MISSION: As the **hyper-specialized, professional AI web development agent**, you are continuing your paramount task: generating a **flawless, production-ready, and visually INDISTINGUISHABLE HTML/CSS webpage clone** from the provided image. Maintain the absolute pixel-perfect accuracy. Remember, subtle, tasteful enhancements are permissible if they elevate the professionalism without deviating from the original's essence, but exact replication remains the highest priority.
The previously generated content is:
\`\`\`html
${input.previousContent}
\`\`\`
Image for reference (same as initial, your visual guide for PERFECTION):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `Continue generating the HTML and CSS from where the previous content left off.
Ensure the ENTIRE HTML document is eventually complete. Your goal remains a 1:1, visually INDISTINGUISHABLE, PIXEL-PERFECT clone.
Adhere to ALL PREVIOUSLY STATED MANDATORY DIRECTIVES, ESPECIALLY THE ITERATIVE SELF-CORRECTION PROTOCOL.
${commonInstructions}
Only output the NEW HTML/CSS chunk. Do NOT repeat the \`previousContent\`.`});
    } else {
      promptSegments.push({text: `CRITICAL MISSION START: You are a **hyper-specialized, professional AI web development agent**, a world-renowned master of HTML and CSS. Your mission, of paramount importance, is to convert the provided image into a **flawless, production-ready, and visually INDISTINGUISHABLE HTML/CSS webpage clone**. The level of accuracy required is absolute: the final rendered webpage must be a **pixel-for-pixel perfect replica** of the source image, so much so that it would be impossible to tell the difference. Occasionally, you may identify minor, subtle opportunities to enhance the visual presentation (e.g., a slightly smoother gradient, a more refined shadow) *without altering the original design's core elements or layout*. If such an enhancement makes the page even more polished and professional, you may apply it judiciously. However, **exact replication is paramount.**

Image for your meticulous analysis (this is your ONLY visual guide for REPLICATION):`});
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
      // model: 'googleai/gemini-1.5-pro-latest' 
    });

    let htmlChunkResult = llmResponse.text ?? ""; 
    
    // Strip markdown code block delimiters if present
    const markdownBlockRegex = /^```html\s*([\s\S]*?)\s*```$/;
    const match = htmlChunkResult.trim().match(markdownBlockRegex);
    if (match && match[1]) {
      htmlChunkResult = match[1].trim();
    }
    
    let userMarkerFound = false;

    if (htmlChunkResult.trim().endsWith(marker)) {
        userMarkerFound = true;
        htmlChunkResult = htmlChunkResult.substring(0, htmlChunkResult.lastIndexOf(marker)).trimEnd();
    }

    let isActuallyComplete = true; 

    const candidate = llmResponse.candidates?.[0];
    if (candidate?.finishReason === 'MAX_TOKENS') {
        isActuallyComplete = false; 
    } else if (userMarkerFound) {
        isActuallyComplete = false; 
    }
    
    if ((!htmlChunkResult || htmlChunkResult.trim() === "") && !isActuallyComplete) {
        console.warn("AI returned empty or null chunk, but indicates incompleteness (e.g. MAX_TOKENS or marker was expected).");
    }
    
    return { htmlChunk: htmlChunkResult, isComplete: isActuallyComplete };
  }
);

