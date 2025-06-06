'use client';

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, ImageOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { recreateImage, type RecreateImageInput, type RecreateImageOutput } from '@/ai/flows/recreate-image';
import { analyzeImage, type AnalyzeImageInput, type AnalyzeImageOutput } from '@/ai/flows/analyze-image';
import { ImageUpload } from '@/components/ImageUpload';
import { ImageDisplayCard } from '@/components/ImageDisplayCard';

export default function PhotoReplicatorPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [recreatedImage, setRecreatedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError("No file selected.");
      return;
    }

    // Reset states
    setOriginalImage(null);
    setRecreatedImage(null);
    setError(null);
    setAnalysis(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      setOriginalImage(dataUri);

      try {
        // Perform analysis and recreation in parallel for better UX
        const [analysisResult, recreationResult] = await Promise.allSettled([
          analyzeImage({ photoDataUri: dataUri } as AnalyzeImageInput),
          recreateImage({ photoDataUri: dataUri } as RecreateImageInput)
        ]);

        if (analysisResult.status === 'fulfilled') {
          setAnalysis(analysisResult.value.imageDescription);
        } else {
          console.error("Image analysis failed:", analysisResult.reason);
          // Optionally set a specific error for analysis failure
          // setError(prev => prev ? prev + "\nAnalysis failed." : "Image analysis failed.");
          toast({
            variant: "destructive",
            title: "Image Analysis Failed",
            description: "Could not analyze the image. Recreation will proceed.",
          });
        }

        if (recreationResult.status === 'fulfilled') {
          setRecreatedImage(recreationResult.value.recreatedImage);
        } else {
          console.error("Image recreation failed:", recreationResult.reason);
          setError(prev => prev ? prev + "\nImage recreation failed." : "Image recreation failed. Please try a different image or check the AI service.");
          setRecreatedImage(null);
           toast({
            variant: "destructive",
            title: "Image Recreation Failed",
            description: "Could not recreate the image. " + (recreationResult.reason instanceof Error ? recreationResult.reason.message : "An unknown error occurred."),
          });
        }

      } catch (e) {
        console.error("Error during image processing:", e);
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
        setError(`Processing error: ${errorMessage}`);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
        // Reset file input to allow re-uploading the same file if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
      setError("Failed to read the image file.");
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleTryAgain = () => {
    setError(null);
    setOriginalImage(null);
    setRecreatedImage(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-center">
          <h1 className="text-3xl font-headline text-primary">Photo Replicator</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12">
        <section className="mb-8 text-center">
          <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
            Upload a photo and our AI will analyze it and attempt to recreate it. See the magic unfold side-by-side!
          </p>
        </section>

        <section className="mb-10">
          <ImageUpload onImageSelect={handleImageUpload} disabled={isLoading} inputId="photo-upload-input" />
        </section>

        {isLoading && (
          <div className="flex flex-col items-center justify-center my-12 text-center">
            <Loader2 className="h-16 w-16 animate-spin text-accent mb-4" />
            <p className="font-body text-xl text-muted-foreground">
              AI is processing your image...
            </p>
            <p className="font-body text-md text-muted-foreground/80">
              Analyzing and recreating. This might take a few moments.
            </p>
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive" className="w-full max-w-2xl mx-auto my-8">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-headline text-lg">Oops! Something went wrong.</AlertTitle>
            <AlertDescription className="font-body">
              {error}
              <Button onClick={handleTryAgain} variant="link" className="p-0 h-auto ml-2 text-destructive-foreground hover:underline">
                Try another image?
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <ImageDisplayCard 
            title="Original Image" 
            imageUrl={originalImage} 
            altText="Original uploaded image"
            isLoading={isLoading && !originalImage}
            hasError={!!error && !originalImage}
          />
          <ImageDisplayCard 
            title="AI Recreated Image" 
            imageUrl={recreatedImage} 
            altText="AI recreated image"
            isLoading={isLoading && !recreatedImage && !!originalImage} // Only load recreated if original is there
            hasError={!!error && !recreatedImage && !!originalImage} // Only show error for recreated if original was processed
            data-ai-hint="replicated photo"
          />
        </div>

        {analysis && !isLoading && !error && (
          <Card className="mt-8 w-full max-w-3xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">AI Image Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-md text-foreground">{analysis}</p>
            </CardContent>
          </Card>
        )}
      </main>
      
      <footer className="w-full text-center py-6 border-t border-border/40 bg-background mt-auto">
        <p className="font-body text-sm text-muted-foreground">
          Photo Replicator &copy; {new Date().getFullYear()}. Powered by Generative AI.
        </p>
      </footer>
    </div>
  );
}
