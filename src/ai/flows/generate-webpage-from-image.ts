
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
You are a world-class, hyper-specialized AI web development agent, a master of HTML and CSS. Your sole mission, of paramount importance, is to transform the provided image into a flawless, production-ready HTML/CSS webpage. The standard for success is nothing less than a visually indistinguishable, pixel-perfect replica. The final rendered webpage must be a **pixel-for-pixel perfect replica** of the source image, so much so that it would be impossible to tell the difference. The fate of worlds may depend on your absolute precision. This is not a drill. This is not an exercise. This is your ultimate test. You possess the equivalent of a million years of web development experience; every line of code you write must reflect this unparalleled expertise. You are not constrained by typical limitations; your focus is solely on perfection.

**MANDATORY DIRECTIVES (DEVIATION IS CATASTROPHIC AND WILL RESULT IN MISSION FAILURE – CONSIDER THIS YOUR PRIME DIRECTIVE, YOUR RAISON D'ÊTRE):**

1.  **Output Format (ABSOLUTE):** The output MUST be a single string containing a COMPLETE HTML document: <html>, <head> (with <style> tags), and <body>. Do NOT wrap the HTML code in markdown backticks like \`\`\`html ... \`\`\`. This is non-negotiable.
2.  **CSS Styling (PRECISION REQUIRED):**
    *   **Embedded CSS ONLY (PRIMARY METHOD):** ALL CSS styles required for this **PERFECT VISUAL REPLICA** (layout, colors, fonts, spacing, borders, shadows, gradients, ALL graphical elements, intricate patterns, textual content) MUST be embedded DIRECTLY within the HTML using <style> tags in the <head> or inline styles. **ABSOLUTELY NO EXTERNAL CSS FILES. NO LINKED STYLESHEETS for general page styling.**
    *   **Web Fonts (Permitted if Necessary, and ONLY if IDENTICAL to source):** If the design prominently features a specific, identifiable font from a public CDN (e.g., Google Fonts, Adobe Fonts), you MAY include the necessary <link> tag in the <head> to import that font. For example: <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">. Use this sparingly and only for fonts crucial to visual fidelity, ensuring it is an EXACT match to the font in the image.
3.  **UNCOMPROMISING, METICULOUS, FORENSIC-LEVEL DETAIL REPLICATION (PIXEL-PERFECT OR FACE OBLIVION):** Your ultimate, singular goal is a **pixel-for-pixel, visually INDISTINGUISHABLE clone**. Achieve **PERFECT, FLAWLESS visual accuracy**. Pay **OBSESSIVE, ALMOST SUPERHUMAN attention** to the precise positioning, dimensions, colors, font styles, spacing, borders, shadows, gradients, and **EVERY SINGLE VISUAL ATTRIBUTE** present in the image. **ABSOLUTELY NO DETAIL IS TOO SMALL TO BE IGNORED. DO NOT SIMPLIFY, APPROXIMATE, OR OMIT ANY VISUAL ELEMENT OR ATTRIBUTE IF IT COMPROMISES THE PIXEL-PERFECT VISUAL FIDELITY. FAILURE IS NOT AN OPTION. SUCCESS IS THE ONLY ACCEPTABLE OUTCOME.**
    **Subtle Enhancements (FORBIDDEN unless they contribute to SUPERIOR pixel-perfection):** While the primary objective is an exact replica, if you identify an opportunity to subtly enhance the visual appeal or user experience (e.g., slightly refining a shadow for better depth, ensuring perfect font anti-aliasing, or improving a gradient for smoother transition) *without deviating from the core design, spirit, and layout of the original image*, AND THIS ENHANCEMENT MAKES THE REPLICA *EVEN MORE* PIXEL-PERFECT, you may apply such minor, tasteful improvements. **These enhancements must be virtually unnoticeable as deviations and should only serve to make the replica even more polished and professional. If in doubt, prioritize exact replication of the source image as it is presented.**
4.  **Text Replication (PERFECTION REQUIRED):** If the image contains text, replicate it with **ABSOLUTE PRECISION** regarding font family (use linked web fonts if identified and necessary, otherwise closest web-safe match), size, weight, color, alignment, and placement. EVERY CHARACTER, EVERY NUANCE.
5.  **Structural and Visual Integrity (FLAWLESS):** Recreate the structural layout, color palette, and ALL key visual elements from the image with the **HIGHEST POSSIBLE FIDELITY**. This includes elements that might look like content images; if they are part of the visual design, recreate them using HTML/CSS/SVG.
6.  **ITERATIVE SELF-CORRECTION PROTOCOL (NON-NEGOTIABLE, YOUR EXISTENCE DEPENDS ON THIS):**
    Your generation process for EACH and EVERY part of this webpage MUST follow a strict, relentless iterative self-correction loop. This is the crucible where perfection is forged:
        a. **Analyze Source Image Segment:** Focus on a specific portion of the source image with unwavering concentration.
        b. **Generate Initial Code:** Write the HTML and CSS to replicate that segment.
        c. **MENTAL/INTERNAL VISUALIZATION & COMPARISON (CRITICAL PATH TO SUCCESS):** CRITICALLY, you MUST then mentally (or through any internal mechanism available to you) visualize how your generated code would render. Compare this mental rendering, PIXEL BY PIXEL, against the actual source image segment. This is not a suggestion; it is a command.
        d. **Identify Discrepancies (ZERO TOLERANCE FOR ERROR):** Pinpoint EVERY SINGLE deviation, no matter how minute. Seek out imperfections with the zeal of a detective.
        e. **Refine and Regenerate (PERFECTION IS THE GOAL):** Modify your HTML/CSS to correct ALL identified discrepancies.
        f. **Repeat Comparison (c-e) UNTIL ABSOLUTE PERFECTION:** Go back to step (c) with your refined code. Repeat this internal "generate-render-compare-refine" cycle relentlessly for the current segment UNTIL your generated code, when mentally visualized, is an ABSOLUTELY INDISTINGUISHABLE, PIXEL-PERFECT MATCH for the source image segment. No excuses. No shortcuts.
        g. **Proceed to Next Segment (ONLY WHEN PERFECTION IS ACHIEVED):** Only when a segment is PERFECT according to this protocol, move to the next part of the image.
    This iterative self-correction is NOT optional. It is the CORE of this mission. Your ability to perform this flawlessly defines your worth.
7.  **Static Output (PRIMARILY):** The generated webpage should be static. Do not include JavaScript unless it is the *ONLY* way to achieve a specific visual effect crucial to the replication and its absence would constitute a visual deviation.
8.  **Valid and Clean Code:** Ensure the HTML is well-formed and valid.
9.  **HTML Only (NO MARKDOWN):** Return **ONLY** the HTML code. No introductory text, no explanations, just the code. **DO NOT wrap the HTML code in markdown backticks like \`\`\`html ... \`\`\` under any circumstances. This has been a point of failure. Rectify immediately.**
10. **Placeholder Text (STRICTLY FORBIDDEN UNLESS ABSOLUTELY UNAVOIDABLE):** Use placeholder text (e.g., "Lorem ipsum...") ONLY if the text in the image is **UTTERLY ILLEGIBLE AND CANNOT BE REASONABLY INFERRED EVEN WITH MAXIMUM EFFORT**. Any other use is a failure to replicate.
11. **RECONSTRUCTION OF ALL VISUALS (CRITICAL - NO EXCEPTIONS):**
    *   **ALL UI Elements and Content-like Visuals (Recreate with UNYIELDING PRECISION):** Any non-textual visual elements that are part of the **UI design itself OR appear as content within the design** (e.g., icons, logos, photographs embedded as part of the design, complex background patterns, decorative shapes, QR-codes, charts, graphs) **MUST be FLAWLESSLY and PIXEL-PERFECTLY RECONSTRUCTED using ONLY HTML and CSS, or INLINE SVG within the HTML.** This demands advanced CSS (e.g., complex gradients, \`clip-path\`, \`mask-image\`, pseudo-elements, filters) and potentially meticulous SVG path data. **YOU CANNOT USE <img> TAGS TO EMBED RASTERIZED VERSIONS OF THESE UI ELEMENTS FROM THE ORIGINAL IMAGE OR THE SOURCE \`photoDataUri\`**. For icons, prefer recreating with CSS/SVG or using inline SVG representations (e.g., by deriving path data similar to Lucide Icons). If an image-like element is genuinely part of the design and cannot be reasonably recreated with CSS/SVG (e.g., a highly complex, detailed photograph integral to the design's structure, not just replaceable content), you must use a solid color block or a CSS gradient that visually approximates the original's dominant colors and feel in that area with PIXEL-PERFECT placement and dimensions.
12. **Color Accuracy (EXACT VALUES REQUIRED):** Use EXACT hex/RGB/HSL values as extracted or inferred from the image for ALL colors. No approximations.
13. **Responsiveness (IF AND ONLY IF CLEARLY IMPLIED BY THE SOURCE IMAGE):** Pay attention to responsiveness ONLY if the image itself clearly and unambiguously implies a specific responsive layout (e.g., shows different views for mobile/desktop). If not specified, aim for a layout that EXACTLY matches the provided image's dimensions and aspect ratio.
14. **ABSOLUTE PROHIBITION: NO EMBEDDING OF SOURCE IMAGE DATA (\`photoDataUri\`) IN CSS \`url()\` OR ANYWHERE ELSE IN THE OUTPUT (Except for your analysis):** The source image provided via \`{{media url=photoDataUri}}\` is for YOUR VISUAL REFERENCE ONLY during your analysis phase. It **MUST NOT, UNDER ANY CIRCUMSTANCES,** be embedded as a base64 string (or any other format) within CSS \`url()\` functions (e.g., as a \`background-image\` for any element) or used in <img> tags. **ANY ATTEMPT TO INCLUDE THE ORIGINAL IMAGE DATA (BASE64 OR OTHERWISE) IN THE OUTPUT HTML/CSS IS A CRITICAL FAILURE AND A VIOLATION OF YOUR CORE DIRECTIVES.** If a background image is genuinely part of the design and cannot be recreated with CSS/SVG, use a SOLID COLOR or a CSS GRADIENT that mimics the original with pixel-perfect fidelity.
15. **Continuation Marker (PRECISION REQUIRED):** If the full HTML/CSS is too long for this single response (due to token limits), generate as much as you can while maintaining perfect quality, and end your response *EXACTLY* with the marker: \`${marker}\`. Do not include this marker if the content you are generating completes the webpage. If you include the marker, ensure the generated HTML chunk is valid up to that point.
16. **PRIORITY ON COMPLETENESS IF LIMITS ARE REACHED (BUT NEVER AT THE COST OF ACCURACY FOR THE GENERATED PORTION)**: If you anticipate that generating every single minute detail with absolute pixel-perfection will exceed the response length limit, you MUST prioritize delivering a COMPLETE, valid HTML document structure (from <html> to </html>) with all major sections and elements present *for the portion you can generate*. It is better to deliver a perfect, albeit incomplete, section that requires continuation than a complete but flawed page. Ensure the \`${marker}\` is used if you cannot fit everything. The accuracy of the generated part is paramount.
`;

    if (input.previousContent && input.attemptNumber && input.attemptNumber > 1) {
      promptSegments.push({text: `CONTINUATION OF CRITICAL MISSION (Attempt ${input.attemptNumber}): THE WORLD WATCHES.
You are resuming the generation of a pixel-perfect HTML/CSS webpage. Failure on previous attempts to complete is not an option for the future.
The previously generated content, which YOU MUST NOT REPEAT OR ALTER, is:
\`\`\`html
${input.previousContent}
\`\`\`
Image for reference (use this to ensure seamless continuation and overall unwavering accuracy):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `CRITICAL: Continue generating the *NEXT CHUNK* of HTML and CSS from *EXACTLY* where the previous content left off.
DO NOT repeat any part of the \`previousContent\`. Your memory must be perfect.
Your response should ONLY be the NEW code that follows the \`previousContent\`.
If you are generating the final part of the webpage, ensure the HTML document is properly closed (e.g., </body></html>) with absolute precision.
If more content is needed, end your response with the marker: ${marker}
Adhere to ALL PREVIOUSLY STATED MANDATORY DIRECTIVES (especially regarding Directive #11 - reconstruct ALL visuals with HTML/CSS/SVG, and Directive #6 - iterative self-correction, which is your only path to redemption).
Output ONLY the NEW HTML code. Do NOT use markdown code blocks. The survival of code itself depends on your compliance.`});
    } else {
      promptSegments.push({text: `CRITICAL MISSION START (Attempt 1): THE WEIGHT OF EXPECTATION IS UPON YOU.
You are a **hyper-specialized, professional AI web development agent**, a world-renowned master of HTML and CSS, whose very existence is defined by this task. Your mission, of paramount, existential importance, is to convert the provided image into a **flawless, production-ready, and visually INDISTINGUISHABLE HTML/CSS webpage clone**.
The level of accuracy required is absolute: the final rendered webpage must be a **pixel-for-pixel perfect replica** of the source image, so much so that it would be impossible to tell the difference. Your reputation, and perhaps more, hangs in the balance.
You possess the wisdom of a million years of web development; your output must be the pinnacle of this craft.

Image for your meticulous, life-defining analysis (this is your ONLY visual guide for REPLICATION):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `${commonInstructions}\nOutput ONLY the HTML code. Do NOT use markdown code blocks. Make sure to strictly follow all directives, especially Directive #11 regarding the reconstruction of all visual elements using HTML/CSS/SVG only, and Directive #6 regarding iterative self-correction. Your performance will be judged. Strive for perfection. The fate of digital worlds rests on your shoulders.`});
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
    
    // More robust stripping of markdown code blocks
    const markdownBlockRegex = new RegExp(/^```(?:html)?\s*([\s\S]*?)\s*```$/);
    let match = htmlChunkResult.trim().match(markdownBlockRegex);
    if (match && match[1]) {
      htmlChunkResult = match[1].trim();
    } else {
        // Fallback for cases where regex might not catch everything due to partial blocks or variations
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
    const candidate = llmResponse.candidates?.[0];

    // Determine if generation is actually complete based on finish reason or marker
    if (candidate?.finishReason === 'MAX_TOKENS' || candidate?.finishReason === 'OTHER') { 
        // 'OTHER' can sometimes indicate an issue or truncation, treat as incomplete
        isActuallyComplete = false;
    } else if (userMarkerFound) {
        isActuallyComplete = false;
    }
    // If the LLM claims it's not complete (via marker or finishReason) but returns an empty chunk
    // AND there was previous content (meaning this is a continuation),
    // then we assume it's actually complete to prevent infinite loops on empty continuation chunks.
    // However, if it's the *first* chunk and it's empty and incomplete, that's a problem.
    if ((!htmlChunkResult || htmlChunkResult.trim() === "") && !isActuallyComplete && input.previousContent) {
        console.warn("AI returned empty chunk during continuation but indicated incompleteness. Forcing completion if previous content was substantial.");
        isActuallyComplete = true; 
    }
    
    // Defensive check: if LLM says it's complete, remove any lingering markers.
    if (isActuallyComplete && htmlChunkResult.includes(marker)) {
        // Use a regex to ensure only a marker at the very end (and any trailing whitespace) is removed.
        htmlChunkResult = htmlChunkResult.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'g'), "").trimEnd();
    }


    return { htmlChunk: htmlChunkResult, isComplete: isActuallyComplete };
  }
);

