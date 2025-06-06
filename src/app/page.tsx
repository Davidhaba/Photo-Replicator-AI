'use client';
import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ImageUpload';
import { ImageDisplayCard } from '@/components/ImageDisplayCard';
import { processImageAction, type ProcessImageResult } from './actions';

export default function PhotoReplicatorPage() {
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
  const [recreatedImageUri, setRecreatedImageUri] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);


  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Reset states for new upload
    setOriginalImageUri(null);
    setRecreatedImageUri(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(true);
    setCurrentFileName(file.name);


    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      setOriginalImageUri(dataUri);

      try {
        const result: ProcessImageResult = await processImageAction(dataUri);
        if (result.error) {
          setError(result.error);
          setRecreatedImageUri(null); // Ensure recreated image is cleared on error
          setAnalysisResult(null);
        } else {
          setRecreatedImageUri(result.recreatedImageUri || null);
          setAnalysisResult(result.analysisResult || null);
        }
      } catch (e) {
        console.error("Error calling processImageAction:", e);
        setError(e instanceof Error ? e.message : "An unexpected error occurred.");
        setRecreatedImageUri(null);
        setAnalysisResult(null);
      } finally {
        setIsLoading(false);
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
    // Optionally reset other states if needed, or allow user to re-select file
    // For now, just clears error, user can re-upload.
  };

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 min-h-screen flex flex-col items-center bg-background text-foreground">
      <header className="text-center mb-8 md:mb-12 w-full">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline text-primary mb-3">
          Photo Replicator
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
          Upload your photo and watch as our AI analyzes and artistically recreates it. Discover a new perspective on your images.
        </p>
      </header>

      <section className="w-full max-w-lg mb-8 md:mb-10">
        <ImageUpload onImageSelect={handleImageUpload} disabled={isLoading} />
      </section>

      {isLoading && (
        <div className="flex flex-col items-center justify-center my-8 text-center">
          <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin text-accent mb-4" />
          <p className="font-body text-lg md:text-xl text-muted-foreground">
            AI is working its magic on {currentFileName ? `"${currentFileName}"` : "your image"}...
          </p>
          <p className="font-body text-sm text-muted-foreground/80">(This may take a moment)</p>
        </div>
      )}

      {error && !isLoading && (
        <Alert variant="destructive" className="w-full max-w-2xl my-8">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-headline text-lg">Oops! Something went wrong.</AlertTitle>
          <AlertDescription className="font-body">
            {error}
            <Button onClick={handleTryAgain} variant="link" className="p-0 h-auto ml-2 text-destructive-foreground">
              Try uploading again?
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {originalImageUri && (
        <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start mb-8 md:mb-10">
          <ImageDisplayCard
            title="Original Image"
            imageUrl={originalImageUri}
            altText={currentFileName || "Original uploaded image"}
            data-ai-hint="user photo"
          />
          <ImageDisplayCard
            title="Recreated Image"
            imageUrl={recreatedImageUri}
            altText="AI recreated image"
            isLoading={isLoading && !recreatedImageUri} // Show skeleton if main loading and no image yet
            hasError={!!error && !recreatedImageUri} // Show error in card if main error and no image
            data-ai-hint="ai version"
          />
        </section>
      )}

      {!isLoading && analysisResult && originalImageUri && !error && (
         <section className="w-full max-w-3xl mt-4 md:mt-8 p-6 bg-card rounded-xl shadow-md border border-border">
            <h2 className="text-2xl md:text-3xl font-headline text-primary mb-3">Image Analysis</h2>
            <p className="font-body text-card-foreground whitespace-pre-wrap text-base md:text-lg leading-relaxed">
              {analysisResult}
            </p>
         </section>
      )}
      
      <footer className="w-full text-center mt-12 md:mt-16 py-6 border-t border-border">
        <p className="font-body text-sm text-muted-foreground">
          Photo Replicator &copy; {new Date().getFullYear()}. Powered by Generative AI.
        </p>
      </footer>
    </div>
  );
}
