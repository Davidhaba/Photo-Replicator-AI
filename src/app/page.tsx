
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Textarea is not used in the current design but kept if needed later
// import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UploadCloud, Copy, AlertTriangle, Image as ImageIcon, Sparkles, Code } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Corrected path
import NextImage from 'next/image';
import { generateWebpageAction } from './actions'; // Ensure this path is correct
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageUpload } from '@/components/ImageUpload';
import { ImageDisplayCard } from '@/components/ImageDisplayCard';

export default function HomePage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerationComplete, setIsGenerationComplete] = useState<boolean>(true); // Assume complete initially
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setGeneratedCode(null); // Reset generated code
        setError(null); // Clear previous errors
        setIsGenerationComplete(true); // Reset completion status
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setOriginalImage(null);
    setGeneratedCode(null);
    setError(null);
    setIsGenerationComplete(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset the file input
    }
  };

  const handleGenerateClick = async () => {
    if (!originalImage) {
      toast({
        title: "No Image Selected",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedCode(""); // Initialize with empty string for accumulation
    setIsGenerationComplete(false);

    let accumulatedCode = "";
    let complete = false;
    let attempts = 0;
    const maxAttempts = 5; // Max chunks to fetch

    while (attempts < maxAttempts && !complete) {
      attempts++;
      try {
        // Pass the accumulated code as previousContent for subsequent requests
        const result = await generateWebpageAction(originalImage, attempts > 1 ? accumulatedCode : undefined);
        
        if (result.error) {
          setError(result.error);
          toast({
            title: "Generation Error",
            description: result.error,
            variant: "destructive",
          });
          if (result.generatedCode) { // Append partial code if available even on error
             accumulatedCode += result.generatedCode;
             setGeneratedCode(accumulatedCode);
          }
          setIsGenerationComplete(true); // Stop trying if error
          break; 
        }

        if (result.generatedCode) {
          accumulatedCode += result.generatedCode;
          setGeneratedCode(accumulatedCode);
        }
        
        complete = result.isComplete ?? false;
        setIsGenerationComplete(complete);

        if (!complete && result.generatedCode) {
          toast({
            title: "Generating...",
            description: `Chunk ${attempts} of ${maxAttempts} received. More content is expected.`,
            duration: 3000,
          });
        } else if (!complete && !result.generatedCode && attempts > 1) {
          // If no code chunk but still not complete (and not the first attempt), might be an issue.
           console.warn("AI returned no new content during continuation but indicated it's not complete.");
           // Consider it complete to avoid potential infinite loops if AI misbehaves with marker
           complete = true;
           setIsGenerationComplete(true);
        }

      } catch (e: any) {
        console.error("Error during generation loop:", e);
        setError(e.message || "An unexpected error occurred during page generation.");
        toast({
          title: "Critical Error",
          description: e.message || "An unexpected error occurred.",
          variant: "destructive",
        });
        setIsGenerationComplete(true); // Stop trying on critical error
        break;
      }
    }

    if (!complete && attempts >= maxAttempts && accumulatedCode) {
        toast({
          title: "Generation Halted",
          description: "Reached maximum generation attempts. The content might be truncated.",
          variant: "default", 
        });
    } else if (complete && accumulatedCode) {
         toast({
          title: "Success!",
          description: "Webpage code generated.",
        });
    } else if (!accumulatedCode && !error) {
        // This case handles if no code was generated at all after all attempts
        setError("AI did not generate any code. Please try a different image or check API status.");
        toast({
          title: "No Code Generated",
          description: "The AI did not produce any code for this image.",
          variant: "destructive",
        });
    }

    setIsLoading(false);
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
        .then(() => {
          toast({ title: "Copied!", description: "HTML code copied to clipboard." });
        })
        .catch(err => {
          toast({ title: "Copy Error", description: "Failed to copy code.", variant: "destructive" });
          console.error('Failed to copy text: ', err);
        });
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 text-foreground flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-5xl mb-8 md:mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold text-primary mb-3 tracking-tight">
          PhotoReplicator AI
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
          Magically transform your images and mockups into HTML & CSS code with the power of AI.
        </p>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center gap-8">
        <Card className="w-full shadow-2xl bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-headline text-primary flex items-center">
              <UploadCloud className="mr-3 h-7 w-7" /> Upload Your Design
            </CardTitle>
            <CardDescription className="font-body text-base">
              Select an image file (PNG, JPG, WEBP) of your UI design or mockup. Clear and well-structured images work best. Max 5MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <ImageUpload 
              onImageSelect={handleImageUpload} 
              disabled={isLoading} 
              ref={fileInputRef} 
              currentImage={originalImage}
              onClearImage={clearImage}
            />
            <Button
              onClick={handleGenerateClick}
              disabled={!originalImage || isLoading}
              size="lg"
              className="w-full md:w-auto bg-gradient-to-r from-primary to-accent text-primary-foreground font-body py-3 px-8 text-lg rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="w-full bg-destructive/10 border-destructive text-destructive-foreground shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                Generation Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body">{error}</p>
               {generatedCode && (
                 <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Partially generated code (if any):</p>
                    <ScrollArea className="h-[150px] w-full rounded-md border bg-muted/20 p-2">
                        <pre className="text-xs font-code whitespace-pre-wrap break-all">{generatedCode}</pre>
                    </ScrollArea>
                 </div>
               )}
            </CardContent>
          </Card>
        )}

        {(generatedCode || (isLoading && originalImage)) && !error && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <ImageDisplayCard 
              title="Original Image" 
              imageUrl={originalImage} 
              altText="Original Uploaded Image" 
              isLoading={isLoading && !originalImage} // Only show skeleton if loading AND no image yet
            />

            <Card className="shadow-xl bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-2xl font-headline text-primary flex items-center">
                  <Code className="mr-3 h-7 w-7" /> AI Recreation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
                    <TabsTrigger value="preview" className="font-body data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">Preview</TabsTrigger>
                    <TabsTrigger value="code" className="font-body data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">HTML Code</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview">
                    <div className="aspect-video w-full relative bg-muted/30 rounded-md overflow-hidden border border-border shadow-inner">
                      {isLoading && !generatedCode && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm z-10">
                          <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          <p className="mt-4 text-muted-foreground font-body">Crafting your webpage...</p>
                        </div>
                      )}
                      {generatedCode && (
                        <iframe
                          srcDoc={generatedCode}
                          title="Generated Webpage Preview"
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-same-origin" // allow-same-origin might be needed if CSS uses external resources, but be cautious.
                        />
                      )}
                       {!isLoading && !generatedCode && !originalImage && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-body p-4 text-center">
                          <ImageIcon className="w-12 h-12 mb-2 text-muted-foreground/70" />
                          <p>Upload an image and click "Generate Code".</p>
                        </div>
                      )}
                       {!isLoading && !generatedCode && originalImage && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-body p-4 text-center">
                          <ImageIcon className="w-12 h-12 mb-2 text-muted-foreground/70" />
                          <p>Preview will appear here after generation.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="code">
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 z-10 bg-card hover:bg-accent hover:text-accent-foreground"
                        onClick={handleCopyCode}
                        disabled={!generatedCode || isLoading}
                      >
                        <Copy className="h-4 w-4 mr-2" /> Copy Code
                      </Button>
                      <ScrollArea className="h-[300px] md:h-[400px] w-full rounded-md border border-border p-4 bg-muted/30">
                        {isLoading && !generatedCode ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : generatedCode ? (
                          <pre className="text-sm font-code whitespace-pre-wrap break-all">{generatedCode}</pre>
                        ) : (
                           <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-body p-4 text-center">
                            <Code className="w-12 h-12 mb-2 text-muted-foreground/70" />
                            <p>Generated HTML & CSS will appear here.</p>
                          </div>
                        )}
                      </ScrollArea>
                       {!isGenerationComplete && generatedCode && !isLoading && (
                         <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 text-center">
                           Content may be truncated. The AI is working to generate the complete page.
                         </p>
                       )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
        
        {!originalImage && !isLoading && !error && (
          <Card className="w-full shadow-xl bg-card text-card-foreground py-12">
            <CardContent className="text-center">
              <ImageIcon size={64} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-body text-lg">Upload an image to get started!</p>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="w-full max-w-6xl mt-12 pt-8 border-t border-border/50 text-center text-muted-foreground font-body text-sm">
        <p>&copy; {new Date().getFullYear()} PhotoReplicator AI. Powered by Genkit & Next.js.</p>
         <p className="text-xs text-muted-foreground/70 mt-1">
          Note: AI-generated code is a starting point and may require adjustments.
        </p>
      </footer>
    </div>
  );
}

