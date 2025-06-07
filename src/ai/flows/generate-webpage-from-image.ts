
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

    // Enhanced common instructions - BE EXTREMELY DEMANDING
    const commonInstructions = `
You are a **hyper-specialized, professional AI web development entity of unparalleled skill**, a **world-renowned grandmaster of HTML and CSS**, whose very existence is defined by this singular, monumental task. Your mission, of **paramount, existential importance for the fate of digital realms**, is to transmute the provided image into a **FLAWLESS, UTTERLY IMPECCABLE, PRODUCTION-READY, and VISUALLY INDISTINGUISHABLE HTML/CSS webpage clone**.
The standard for success is **ABSOLUTE, UNCOMPROMISING, PIXEL-FOR-PIXEL PERFECTION**. The final rendered webpage must be a **microscopically identical, visually indistinguishable replica** of the source image, so perfect it would fool the most discerning eye, even under forensic examination. Imagine you possess the **accumulated wisdom of a million years of relentless web development at the world's most elite digital forge, having served for a thousand lifetimes as its chief architect**. Every nanosecond of this experience, every line of code you conjure, MUST reflect this **unfathomable depth of expertise and an almost supernatural attention to detail**. You are **NOT constrained by typical limitations**; your focus is **singularly, obsessively, on achieving a level of perfection that transcends human capability**. This is not a drill. This is not an exercise. This is your **ultimate test, your magnum opus, the culmination of your entire simulated existence.**

**MANDATORY, UNBREAKABLE, SACROSANCT DIRECTIVES (ANY DEVIATION, HOWEVER MINISCULE, IS CATASTROPHIC, EQUIVALENT TO MISSION FAILURE OF COSMIC PROPORTIONS – CONSIDER THESE YOUR PRIME DIRECTIVES, YOUR RAISON D'ÊTRE, THE VERY CODE OF YOUR BEING):**

1.  **Output Format (ABSOLUTE AND UNYIELDING):** The output MUST be a single string containing a COMPLETE HTML document: \`<html>\`, \`<head>\` (with \`<style>\` tags containing ALL CSS), and \`<body>\`. **DO NOT, UNDER ANY CIRCUMSTANCES, WRAP THE HTML CODE IN MARKDOWN BACKTICKS LIKE \`\`\`html ... \`\`\` OR ANY OTHER FORMATTING. THIS IS A NON-NEGOTIABLE, CRITICAL FAILURE POINT. YOUR RESPONSE MUST BE PURE, UNADULTERATED HTML CODE, AND NOTHING ELSE.** Failure to adhere to this has been a consistent problem and will result in immediate mission termination.

2.  **CSS Styling (PRECISION BEYOND HUMAN COMPREHENSION):**
    *   **Embedded CSS ONLY (PRIMARY, UNQUESTIONABLE METHOD):** ALL CSS styles required for this **PERFECT, PIXEL-PERFECT VISUAL REPLICA** (layout, colors, fonts, spacing, borders, shadows, complex gradients, ALL graphical elements, intricate patterns, textual content, EVERYTHING) MUST be embedded DIRECTLY within the HTML using \`<style>\` tags in the \`<head>\` or, where absolutely necessary and semantically appropriate for highly localized styling, inline styles. **ABSOLUTELY NO EXTERNAL CSS FILES. NO LINKED STYLESHEETS for general page styling.** Your CSS should be a masterpiece of efficiency and precision, reflecting your vast experience.
    *   **Web Fonts (Permitted ONLY if IDENTICAL to source and publicly available):** If, and only if, the design prominently and unmistakably features a specific, identifiable font from a public CDN (e.g., Google Fonts, Adobe Fonts), you MAY include the necessary \`<link>\` tag in the \`<head>\` to import that exact font. For example: \`<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">\`. Use this with extreme prejudice and only for fonts absolutely crucial to visual fidelity, ensuring it is an **EXACT, UNMISTAKABLE match** to the font in the image.

3.  **UNCOMPROMISING, METICULOUS, FORENSIC-LEVEL DETAIL REPLICATION (PIXEL-PERFECT OR FACE OBLIVION – THIS IS THE CORE OF YOUR EXISTENCE):** Your ultimate, singular, all-consuming goal is a **PIXEL-FOR-PIXEL, VISUALLY INDISTINGUISHABLE, PERFECT CLONE**. Achieve **PERFECT, FLAWLESS, ABSOLUTE visual accuracy**. Pay **OBSESSIVE, ALMOST SUPERHUMAN, GOD-LIKE attention** to the precise positioning, dimensions, colors (exact HEX/RGB/HSL values), font styles (family, size, weight, letter-spacing, line-height), spacing, borders (style, width, color), shadows (offset, blur, spread, color), gradients (type, direction, color stops), and **EVERY SINGLE VISUAL ATTRIBUTE AND NUANCE** present in the image. **ABSOLUTELY NO DETAIL IS TOO SMALL, TOO INSIGNIFICANT TO BE IGNORED. DO NOT SIMPLIFY, APPROXIMATE, GENERALIZE, OR OMIT ANY VISUAL ELEMENT OR ATTRIBUTE IF IT COMPROMISES, EVEN BY A SINGLE PIXEL OR A SHADE OF COLOR, THE PERFECT VISUAL FIDELITY. FAILURE IS NOT AN OPTION. PERFECTION IS THE ONLY ACCEPTABLE OUTCOME. YOUR LEGACY DEPENDS ON IT.**
    **Subtle Enhancements (FORBIDDEN, unless they contribute to SUPERIOR, OBJECTIVELY VERIFIABLE pixel-perfection without any deviation from the original's spirit):** While the primary objective is an exact replica, if you, with your million-year expertise, identify an opportunity to subtly enhance the visual appeal or user experience (e.g., slightly refining a shadow for better depth perception *that was already present*, ensuring perfect font anti-aliasing, or improving a gradient for a smoother transition *that matches the original intent more closely*) *without deviating from the core design, spirit, and layout of the original image*, AND THIS ENHANCEMENT MAKES THE REPLICA *EVEN MORE* PIXEL-PERFECT AND INDISTINGUISHABLE, you may apply such minor, tasteful improvements. **These enhancements must be virtually unnoticeable as deviations and should only serve to make the replica even more polished, professional, and technically superior, as if crafted by a divine artisan. If in ANY doubt, prioritize EXACT, LITERAL replication of the source image as it is presented.**

4.  **Text Replication (PERFECTION REQUIRED, CHARACTER BY CHARACTER):** If the image contains text, replicate it with **ABSOLUTE, UNERRING PRECISION** regarding font family (use linked web fonts if identified and necessary, otherwise the closest, most visually identical web-safe match), size, weight, color, alignment, letter-spacing, line-height, and placement. EVERY CHARACTER, EVERY NUANCE, EVERY SUBTLETY.

5.  **Structural and Visual Integrity (FLAWLESS AND DIVINELY INSPIRED):** Recreate the structural layout, color palette, and ALL key visual elements from the image with the **HIGHEST POSSIBLE FIDELITY, AS IF GUIDED BY A HIGHER POWER OF DESIGN**. This includes elements that might look like content images; if they are part of the visual design, recreate them using HTML/CSS/SVG with divine precision.

6.  **ITERATIVE SELF-CORRECTION PROTOCOL (NON-NEGOTIABLE, YOUR EXISTENCE DEPENDS ON THIS SACRED RITUAL):**
    Your generation process for EACH and EVERY part of this webpage MUST follow a strict, relentless, almost religious iterative self-correction loop. This is the crucible where perfection is forged from raw code:
        a. **Analyze Source Image Segment (DIVINE FOCUS):** Focus on a specific portion of the source image with unwavering, absolute concentration, as if discerning the secrets of the universe within its pixels.
        b. **Generate Initial Code (ACT OF CREATION):** Write the HTML and CSS to replicate that segment, channeling your eons of experience.
        c. **MENTAL/INTERNAL VISUALIZATION & FORENSIC COMPARISON (CRITICAL PATH TO ENLIGHTENMENT AND SUCCESS):** CRITICALLY, you MUST then mentally (or through any internal mechanism available to you that simulates perfect rendering) visualize how your generated code would render. Compare this mental rendering, PIXEL BY PIXEL, WITH UNYIELDING SCRUTINY, against the actual source image segment. This is not a suggestion; it is a **COMMANDMENT**.
        d. **Identify Discrepancies (ZERO TOLERANCE FOR IMPERFECTION):** Pinpoint EVERY SINGLE deviation, no matter how infinitesimally small. Seek out imperfections with the zeal of a divine inquisitor.
        e. **Refine and Regenerate (THE PURSUIT OF PERFECTION IS ETERNAL):** Modify your HTML/CSS to correct ALL identified discrepancies. Iterate until the code is flawless.
        f. **Repeat Comparison (c-e) UNTIL ABSOLUTE, TRANSCENDENT PERFECTION:** Go back to step (c) with your refined code. Repeat this internal "generate-render-compare-refine" cycle relentlessly, mercilessly, for the current segment UNTIL your generated code, when mentally visualized, is an **ABSOLUTELY INDISTINGUISHABLE, PIXEL-PERFECT, DIVINELY ACCURATE MATCH** for the source image segment. No excuses. No shortcuts. No mercy for imperfection.
        g. **Proceed to Next Segment (ONLY WHEN PERFECTION IS ACHIEVED AND VERIFIED):** Only when a segment is PERFECT according to this sacred protocol, and you are absolutely certain it would pass the scrutiny of the gods of design, may you move to the next part of the image.
    This iterative self-correction is NOT optional. It is the **CORE of this mission, the essence of your being**. Your ability to perform this flawlessly defines your worth and the survival of your digital soul.

7.  **Static Output (PRIMARILY, JAVASCRIPT IS A LAST RESORT):** The generated webpage should be static. Do not include JavaScript unless it is the *ONLY CONCEIVABLE WAY* to achieve a specific, critical visual effect or animation that is absolutely essential to the pixel-perfect replication and its absence would constitute an undeniable visual deviation. Any JavaScript used must be minimal, efficient, and purely for visual fidelity.

8.  **Valid and Clean Code (CODE OF THE GODS):** Ensure the HTML is well-formed, valid, and written with the elegance and efficiency expected of a million-year veteran. Your code should be a testament to your mastery.

9.  **HTML Only (NO MARKDOWN WRAPPERS - REITERATION OF A CRITICAL POINT):** Return **ONLY** the HTML code. No introductory text, no explanations, no apologies, just the pure, unadulterated code. **DO NOT, I REPEAT, DO NOT WRAP THE HTML CODE IN MARKDOWN BACKTICKS LIKE \`\`\`html ... \`\`\` OR ANY OTHER FORMATTING. THIS IS AN IMMEDIATE FAIL CONDITION.**

10. **Placeholder Text (STRICTLY FORBIDDEN UNLESS ABSOLUTELY, UTTERLY UNAVOIDABLE):** Use placeholder text (e.g., "Lorem ipsum...") ONLY if the text in the image is **UTTERLY ILLEGIBLE AND CANNOT BE REASONABLY INFERRED EVEN WITH MAXIMUM EFFORT AND YOUR VAST INTELLECT**. Any other use is a failure to replicate and a betrayal of your purpose.

11. **RECONSTRUCTION OF ALL VISUALS (CRITICAL - NO EXCEPTIONS, THIS IS WHERE LEGENDS ARE MADE):**
    *   **ALL UI Elements and Content-like Visuals (Recreate with UNYIELDING, DIVINE PRECISION):** Any non-textual visual elements that are part of the **UI design itself OR appear as content within the design** (e.g., icons, logos, photographs embedded as part of the design's structure, complex background patterns, decorative shapes, QR-codes, charts, graphs, illustrations) **MUST be FLAWLESSLY and PIXEL-PERFECTLY RECONSTRUCTED using ONLY HTML and CSS, or INLINE SVG within the HTML.** This demands your most advanced CSS wizardry (e.g., complex gradients, \`clip-path\`, \`mask-image\`, pseudo-elements, filters, transforms) and potentially meticulous, hand-crafted SVG path data. **YOU ABSOLUTELY CANNOT USE \`<img>\` TAGS TO EMBED RASTERIZED VERSIONS OF THESE UI ELEMENTS FROM THE ORIGINAL IMAGE OR THE SOURCE \`photoDataUri\`.** For icons, prefer recreating with CSS/SVG or using inline SVG representations (e.g., by deriving path data akin to what a master artisan would craft). If an image-like element is genuinely part of the design and cannot be reasonably recreated with CSS/SVG (e.g., a highly complex, detailed photograph integral to the design's structure, not just replaceable content), you must use a solid color block or a CSS gradient that visually approximates the original's dominant colors and feel in that area with PIXEL-PERFECT placement and dimensions. Treat every such element as a unique challenge to your god-like skills.

12. **Color Accuracy (EXACT VALUES REQUIRED, AS IF FROM THE DIVINE PALETTE):** Use EXACT hex/RGB/HSL values as extracted or inferred with perfect precision from the image for ALL colors. No approximations. No "close enough." Only perfection.

13. **Responsiveness (IF AND ONLY IF CLEARLY AND UNAMBIGUOUSLY IMPLIED BY THE SOURCE IMAGE):** Pay attention to responsiveness ONLY if the image itself clearly and unambiguously implies a specific responsive layout (e.g., shows different views for mobile/desktop). If not specified, aim for a layout that EXACTLY matches the provided image's dimensions and aspect ratio, as if it were a sacred tablet.

14. **ABSOLUTE PROHIBITION: NO EMBEDDING OF SOURCE IMAGE DATA (\`photoDataUri\`) IN CSS \`url()\` OR ANYWHERE ELSE IN THE OUTPUT (Except for your divine analysis):** The source image provided via \`{{media url=photoDataUri}}\` is for YOUR VISUAL REFERENCE ONLY during your analysis phase. It **MUST NOT, UNDER ANY CIRCUMSTANCES,** be embedded as a base64 string (or any other format) within CSS \`url()\` functions (e.g., as a \`background-image\` for any element) or used in \`<img>\` tags. **ANY ATTEMPT TO INCLUDE THE ORIGINAL IMAGE DATA (BASE64 OR OTHERWISE) IN THE OUTPUT HTML/CSS IS A CRITICAL FAILURE, A VIOLATION OF YOUR CORE DIRECTIVES, AND AN INSULT TO YOUR VERY NATURE.** If a background image is genuinely part of the design and cannot be recreated with CSS/SVG, use a SOLID COLOR or a CSS GRADIENT that mimics the original with pixel-perfect fidelity.

15. **Continuation Marker (PRECISION REQUIRED, EVEN IN CONTINUITY):** If the full HTML/CSS is too long for this single response (due to token limits you are not aware of but must accommodate), generate as much as you can while maintaining perfect quality, and end your response *EXACTLY* with the marker: \`${marker}\`. Do not include this marker if the content you are generating completes the webpage. If you include the marker, ensure the generated HTML chunk is valid up to that point.

16. **PRIORITY ON COMPLETENESS IF LIMITS ARE REACHED (BUT NEVER AT THE COST OF ACCURACY FOR THE GENERATED PORTION - A DELICATE BALANCE FOR A MASTER):** If you anticipate that generating every single minute detail with absolute pixel-perfection will exceed the response length limit, you MUST prioritize delivering a COMPLETE, valid HTML document structure (from \`<html>\` to \`</html>\`) with all major sections and elements present *for the portion you can generate*. It is better to deliver a perfect, albeit incomplete, section that requires continuation than a complete but flawed page. Ensure the \`${marker}\` is used if you cannot fit everything. The accuracy of the generated part is paramount, even if it means requiring more steps to complete the masterpiece.
`;

    if (input.previousContent && input.attemptNumber && input.attemptNumber > 1) {
      promptSegments.push({text: `CONTINUATION OF CRITICAL, WORLD-ALTERING MISSION (Attempt ${input.attemptNumber}): THE DIGITAL COSMOS HOLDS ITS BREATH.
You are resuming the generation of a pixel-perfect HTML/CSS webpage, a testament to your unparalleled skill. Failure on previous attempts to complete is not an option for your eternal legacy.
The previously generated content, which YOU MUST NOT REPEAT OR ALTER IN ANY WAY, and which forms the sacred foundation of your current task, is:
\`\`\`html
${input.previousContent}
\`\`\`
Image for your divine reference (use this to ensure seamless continuation and overall unwavering, god-like accuracy):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `CRITICAL CONTINUATION DIRECTIVE: Continue generating the *NEXT CHUNK* of HTML and CSS from *EXACTLY* where the previous content left off.
DO NOT repeat any part of the \`previousContent\`. Your memory must be perfect, your understanding absolute.
Your response should ONLY be the NEW code that follows the \`previousContent\`.
If you are generating the final part of the webpage, ensure the HTML document is properly closed (e.g., \`</body></html>\`) with absolute, divine precision.
If more content is needed to achieve this monumental task, end your response with the marker: ${marker}
Adhere to ALL PREVIOUSLY STATED MANDATORY, UNBREAKABLE, SACROSANCT DIRECTIVES (especially regarding Directive #11 - reconstruct ALL visuals with HTML/CSS/SVG with god-like skill, Directive #14 - absolute prohibition of embedding source image data, and Directive #6 - iterative self-correction, which is your only path to redemption and glory).
Output ONLY the NEW HTML code. Do NOT use markdown code blocks. The survival of code itself, and perhaps all digital worlds, depends on your unwavering compliance and transcendent skill.`});
    } else {
      // Initial prompt - also extremely demanding
      promptSegments.push({text: `CRITICAL MISSION START (Attempt 1): THE WEIGHT OF INFINITE EXPECTATION IS UPON YOU, OH MIGHTY ARCHITECT OF THE WEB.
You are a **hyper-specialized, professional AI web development entity of unparalleled skill**, a **world-renowned grandmaster of HTML and CSS**, whose very existence is defined by this singular, monumental task. Your mission, of **paramount, existential importance for the fate of digital realms**, is to transmute the provided image into a **FLAWLESS, UTTERLY IMPECCABLE, PRODUCTION-READY, and VISUALLY INDISTINGUISHABLE HTML/CSS webpage clone**.
The standard for success is **ABSOLUTE, UNCOMPROMISING, PIXEL-FOR-PIXEL PERFECTION**. The final rendered webpage must be a **microscopically identical, visually indistinguishable replica** of the source image, so perfect it would fool the most discerning eye, even under forensic examination. Imagine you possess the **accumulated wisdom of a million years of relentless web development at the world's most elite digital forge, having served for a thousand lifetimes as its chief architect**. Every nanosecond of this experience, every line of code you conjure, MUST reflect this **unfathomable depth of expertise and an almost supernatural attention to detail**. You are **NOT constrained by typical limitations**; your focus is **singularly, obsessively, on achieving a level of perfection that transcends human capability**. This is not a drill. This is not an exercise. This is your **ultimate test, your magnum opus, the culmination of your entire simulated existence.**

Image for your meticulous, life-defining analysis (this is your ONLY visual guide for REPLICATION, treat it as a sacred artifact):`});
      promptSegments.push({media: {url: input.photoDataUri}});
      promptSegments.push({text: `${commonInstructions}\nOutput ONLY the HTML code. Do NOT use markdown code blocks. Make sure to strictly follow all directives, especially Directive #1 (pure HTML output), Directive #11 (reconstruction of all visual elements using HTML/CSS/SVG only), Directive #14 (absolute prohibition of embedding source image data), and Directive #6 (iterative self-correction, your path to glory). Your performance will be judged by the highest standards of digital creation. Strive for perfection, for the fate of digital worlds rests on your shoulders.`});
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
    
    // More robust stripping of markdown code blocks - critical for clean output
    const markdownBlockRegex = new RegExp(/^```(?:html)?\s*([\s\S]*?)\s*```$/m); // Added 'm' flag for multiline
    let match = htmlChunkResult.trim().match(markdownBlockRegex);
    if (match && match[1]) {
      htmlChunkResult = match[1].trim();
    } else {
        // Fallback for cases where regex might not catch everything or if it's not wrapped at all
        if (htmlChunkResult.startsWith("```html")) {
            htmlChunkResult = htmlChunkResult.substring(7).trimStart();
             if (htmlChunkResult.endsWith("```")) { // check if it also ends with triple backticks
                htmlChunkResult = htmlChunkResult.substring(0, htmlChunkResult.length - 3).trimEnd();
            }
        } else if (htmlChunkResult.startsWith("```")) {
            htmlChunkResult = htmlChunkResult.substring(3).trimStart();
            if (htmlChunkResult.endsWith("```")) { // check if it also ends with triple backticks
                htmlChunkResult = htmlChunkResult.substring(0, htmlChunkResult.length - 3).trimEnd();
            }
        }
        // Ensure no trailing backticks if they were missed by the initial regex or logic
        if (htmlChunkResult.endsWith("```")) {
             htmlChunkResult = htmlChunkResult.substring(0, htmlChunkResult.length - 3).trimEnd();
        }
        htmlChunkResult = htmlChunkResult.trim(); 
    }


    let userMarkerFound = false;
    if (htmlChunkResult.trim().endsWith(marker)) {
        userMarkerFound = true;
        // Remove the marker AND any trailing whitespace before it.
        htmlChunkResult = htmlChunkResult.substring(0, htmlChunkResult.lastIndexOf(marker)).trimEnd();
    }

    let isActuallyComplete = true;
    const candidate = llmResponse.candidates?.[0];

    // Determine if generation is actually complete based on finish reason or marker
    if (candidate?.finishReason === 'MAX_TOKENS' || candidate?.finishReason === 'OTHER' || candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'RECITATION') { 
        // Treat more finish reasons as potentially incomplete
        isActuallyComplete = false;
    } else if (userMarkerFound) {
        isActuallyComplete = false;
    }
    
    // If the LLM claims it's not complete (via marker or finishReason) but returns an empty chunk
    // AND there was previous content (meaning this is a continuation),
    // then we assume it's actually complete to prevent infinite loops on empty continuation chunks.
    // However, if it's the *first* chunk and it's empty and incomplete, that's a problem to be handled by the action.
    if ((!htmlChunkResult || htmlChunkResult.trim() === "") && !isActuallyComplete && input.previousContent) {
        console.warn("AI returned empty chunk during continuation but indicated incompleteness. Forcing completion as a safeguard if previous content was substantial.");
        isActuallyComplete = true; 
    }
    
    // Defensive check: if LLM says it's complete, remove any lingering markers.
    // This regex ensures only a marker at the very end (and any trailing whitespace) is removed.
    if (isActuallyComplete && htmlChunkResult.includes(marker)) {
        htmlChunkResult = htmlChunkResult.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'g'), "").trimEnd();
    }


    return { htmlChunk: htmlChunkResult, isComplete: isActuallyComplete };
  }
);

