'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UploadCloud, Copy, AlertTriangle, Image as ImageIcon, Sparkles, Code, MonitorSmartphone, Eye, Palette, BrainCircuit, Zap } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { generateWebpageAction } from './actions'; // Ensure this path is correct
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageUpload } from '@/components/ImageUpload';
import { ImageDisplayCard } from '@/components/ImageDisplayCard';
import { Separator } from '@/components/ui/separator';

const MAX_ATTEMPTS = 5; // Define maxAttempts as a constant

export default function HomePage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerationComplete, setIsGenerationComplete] = useState<boolean>(true);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [attempts, setAttempts] = useState(0); // Add attempts to state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setGeneratedCode(null);
        setError(null);
        setIsGenerationComplete(true);
        setProgressMessage("");
        setAttempts(0); // Reset attempts
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setOriginalImage(null);
    setGeneratedCode(null);
    setError(null);
    setIsGenerationComplete(true);
    setProgressMessage("");
    setAttempts(0); // Reset attempts
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateClick = async () => {
    if (!originalImage) {
      toast({
        title: "No Image Selected",
        description: "Please upload an image first to transform it into code.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedCode("");
    setIsGenerationComplete(false);
    setProgressMessage("Initializing generation...");
    setAttempts(0); // Reset attempts before starting

    let accumulatedCode = "";
    let complete = false;
    let currentAttempt = 0; // Local variable for loop control

    while (currentAttempt < MAX_ATTEMPTS && !complete) {
      currentAttempt++;
      setAttempts(currentAttempt); // Update state for progress bar
      setProgressMessage(`Generating code chunk ${currentAttempt}/${MAX_ATTEMPTS}...`);
      try {
        const result = await generateWebpageAction(originalImage, currentAttempt > 1 ? accumulatedCode : undefined);

        if (result.error) {
          setError(result.error);
          toast({
            title: "Generation Error",
            description: result.error,
            variant: "destructive",
          });
          if (result.generatedCode) {
             accumulatedCode += result.generatedCode;
             setGeneratedCode(accumulatedCode);
          }
          setIsGenerationComplete(true);
          setProgressMessage("Generation failed.");
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
            title: "Processing...",
            description: `Chunk ${currentAttempt} received. Continuing generation.`,
            duration: 3000,
          });
        } else if (!complete && !result.generatedCode && currentAttempt > 1) {
           console.warn("AI returned no new content during continuation but indicated it's not complete.");
           complete = true; // Assume completion to avoid infinite loop
           setIsGenerationComplete(true);
           setProgressMessage("Generation finished with potential truncation.");
        }

      } catch (e: any) {
        console.error("Error during generation loop:", e);
        const errorMessage = e.message || "An unexpected error occurred during page generation.";
        setError(errorMessage);
        toast({
          title: "Critical Error",
          description: errorMessage,
          variant: "destructive",
        });
        setIsGenerationComplete(true);
        setProgressMessage("Generation critically failed.");
        break;
      }
    }

    if (!complete && currentAttempt >= MAX_ATTEMPTS && accumulatedCode) {
        toast({
          title: "Generation Halted",
          description: `Reached maximum ${MAX_ATTEMPTS} attempts. The content might be truncated.`,
          variant: "default",
        });
        setProgressMessage(`Max ${MAX_ATTEMPTS} attempts reached. Content may be partial.`);
    } else if (complete && accumulatedCode) {
         toast({
          title: "Success!",
          description: "Webpage code generated successfully.",
          variant: "default",
          className: "bg-green-600 text-white border-green-700"
        });
        setProgressMessage("Generation Complete!");
    } else if (!accumulatedCode && !error) {
        setError("AI did not generate any code. Please try a different image or check AI service status.");
        toast({
          title: "No Code Generated",
          description: "The AI did not produce any code for this image.",
          variant: "destructive",
        });
        setProgressMessage("No code generated.");
    }

    setIsLoading(false);
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
        .then(() => {
          toast({ title: "Copied!", description: "HTML code copied to clipboard.", className: "bg-green-600 text-white border-green-700" });
        })
        .catch(err => {
          toast({ title: "Copy Error", description: "Failed to copy code.", variant: "destructive" });
          console.error('Failed to copy text: ', err);
        });
    }
  };


  const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <Card className="bg-card/70 backdrop-blur-sm border-border/30 hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 text-foreground flex flex-col items-center p-4 sm:p-6 md:p-8 transition-all duration-500 ease-in-out">
      <header className="w-full max-w-5xl mb-8 md:mb-12 text-center py-8">
        <div className="inline-block p-3 bg-gradient-to-r from-primary to-accent rounded-xl shadow-lg mb-4">
          <Palette size={48} className="text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-3">
          PhotoReplicator AI
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
          Transform your visual ideas into interactive web experiences. Upload an image, and let AI craft the HTML and CSS for you.
        </p>
      </header>

      <main className="w-full max-w-6xl flex flex-col items-center gap-8">
        <Card className="w-full shadow-2xl bg-card/90 backdrop-blur-lg border border-border/60 rounded-xl overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="text-2xl md:text-3xl font-headline text-primary flex items-center justify-center sm:justify-start">
              <UploadCloud className="mr-3 h-8 w-8" /> Upload Your Design
            </CardTitle>
            <CardDescription className="font-body text-base text-muted-foreground text-center sm:text-left">
              Select an image (PNG, JPG, WEBP, GIF) of your UI design or mockup. Clear, well-structured images yield the best results. Max 5MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 p-6 md:p-8">
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
              className="w-full md:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold py-3 px-10 text-lg rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-300 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>{progressMessage || "Generating..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Code
                </>
              )}
            </Button>
            {isLoading && (
                <div className="w-full max-w-md mt-4">
                    <div className="relative pt-1">
                         <div className="flex mb-2 items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary/20">
                                    Task Progress
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold inline-block text-primary">
                                    {Math.round((attempts / MAX_ATTEMPTS) * 100)}%
                                </span>
                            </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary/20">
                            <div style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-primary to-accent transition-all duration-500"></div>
                        </div>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="w-full bg-destructive/10 border-destructive text-destructive-foreground shadow-md animate-fadeIn p-6 rounded-xl">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Generation Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="font-body text-sm">{error}</p>
               {generatedCode && (
                 <div className="mt-4">
                    <p className="text-sm font-medium mb-1">Partially generated code (if any):</p>
                    <ScrollArea className="h-[150px] w-full rounded-md border bg-background/50 p-3">
                        <pre className="text-xs font-code whitespace-pre-wrap break-all">{generatedCode}</pre>
                    </ScrollArea>
                 </div>
               )}
            </CardContent>
          </Card>
        )}

        {(originalImage || isLoading) && !error && ( // Show this section if there's an image or loading, and no error
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 animate-fadeIn">
            <ImageDisplayCard
              title="Original Image"
              imageUrl={originalImage}
              altText="Original Uploaded Design"
              isLoading={isLoading && !originalImage} // Only show skeleton if loading AND no image yet
              className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl h-full"
            />

            <Card className="shadow-xl bg-card/80 backdrop-blur-md border border-border/50 rounded-xl flex flex-col h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-headline text-primary flex items-center">
                  <MonitorSmartphone className="mr-3 h-7 w-7" /> AI Generated Output
                </CardTitle>
                 <CardDescription className="font-body text-base text-muted-foreground">
                  Preview the generated webpage or view the HTML code.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0 flex-grow flex flex-col">
                <Tabs defaultValue="preview" className="w-full flex flex-col flex-grow">
                  <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/30 rounded-lg p-1">
                    <TabsTrigger value="preview" className="font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md py-2 transition-all">
                        <Eye className="mr-2 h-4 w-4"/> Preview
                    </TabsTrigger>
                    <TabsTrigger value="code" className="font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md py-2 transition-all">
                        <Code className="mr-2 h-4 w-4"/> HTML Code
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="flex-grow">
                    <div className="aspect-video w-full h-full relative bg-muted/20 rounded-lg overflow-hidden border border-border shadow-inner">
                      {isLoading && !generatedCode && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 backdrop-blur-sm z-10">
                          <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          <p className="mt-4 text-muted-foreground font-body">Crafting your webpage...</p>
                        </div>
                      )}
                      {generatedCode ? (
                        <iframe
                          srcDoc={generatedCode}
                          title="Generated Webpage Preview"
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : (
                       !isLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-body p-4 text-center">
                          <ImageIcon className="w-16 h-16 mb-3 text-muted-foreground/70" />
                          <p>Preview will appear here after generation.</p>
                        </div>)
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="code" className="flex-grow flex flex-col">
                    <div className="relative flex-grow flex flex-col">
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 z-10 bg-card hover:bg-accent hover:text-accent-foreground text-xs px-3 py-1.5 rounded-md shadow-sm border-primary/30"
                        onClick={handleCopyCode}
                        disabled={!generatedCode || isLoading}
                      >
                        <Copy className="h-4 w-4 mr-2" /> Copy Code
                      </Button>
                      <ScrollArea className="flex-grow w-full rounded-md border border-border p-4 bg-muted/20 mt-2">
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
                         <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 text-center animate-pulse">
                           Generating more content... Please wait.
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
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-in-bottom">
            <FeatureCard 
              icon={Sparkles}
              title="Instant Code Generation"
              description="Turn your image mockups into HTML & CSS code in seconds with advanced AI."
            />
            <FeatureCard 
              icon={Palette}
              title="Pixel-Perfect Replication"
              description="Our AI strives to match your design with high fidelity, including colors, fonts, and layout."
            />
            <FeatureCard 
              icon={BrainCircuit}
              title="Iterative Refinement"
              description="The AI continuously learns and improves, aiming for better results with each generation."
            />
          </div>
        )}

        {!originalImage && !isLoading && !error && (
          <Card className="w-full shadow-xl bg-card/80 backdrop-blur-md border-border/50 rounded-xl py-12 animate-slide-in-bottom mt-8">
            <CardContent className="text-center">
              <ImageIcon size={64} className="mx-auto text-primary/70 mb-4" />
              <h2 className="text-2xl font-headline text-foreground mb-2">Ready to Transform Your Designs?</h2>
              <p className="text-muted-foreground font-body text-lg max-w-md mx-auto">
                Upload an image of your UI mockup and watch as AI crafts the foundational code for you.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="w-full max-w-6xl mt-16 py-8 border-t border-border/30 text-center">
        <p className="text-muted-foreground font-body text-sm">&copy; {new Date().getFullYear()} PhotoReplicator AI. Powered by Genkit & Next.js.</p>
         <p className="text-xs text-muted-foreground/70 mt-1">
          AI-generated code is a starting point. Always review and refine for production use. Images are not stored.
        </p>
      </footer>
    </div>
  );
}
