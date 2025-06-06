
'use client';
import React, { useState } from 'react';
import { Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ImageUpload';
import { generateWebpageAction, type GenerateWebpageResult } from './actions';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function ImageToWebpagePage() {
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadedImageUri(null);
    setGeneratedCode(null);
    setError(null);
    setIsLoading(true);
    setCurrentFileName(file.name);
    setHasCopied(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      setUploadedImageUri(dataUri); // Keep for potential display or re-processing

      try {
        const result: GenerateWebpageResult = await generateWebpageAction(dataUri);
        if (result.error) {
          setError(result.error);
          setGeneratedCode(null);
        } else {
          setGeneratedCode(result.generatedCode || null);
        }
      } catch (e) {
        console.error("Error calling generateWebpageAction:", e);
        setError(e instanceof Error ? e.message : "An unexpected error occurred during code generation.");
        setGeneratedCode(null);
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
    setUploadedImageUri(null);
    setGeneratedCode(null);
    setCurrentFileName(null);
    const fileInput = document.getElementById('image-upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleCopyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
        .then(() => {
          setHasCopied(true);
          toast({ title: "Copied to clipboard!", description: "HTML code has been copied." });
          setTimeout(() => setHasCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy code to clipboard." });
        });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 min-h-screen flex flex-col items-center bg-background text-foreground">
      <header className="text-center mb-8 md:mb-12 w-full">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline text-primary mb-3">
          AI Image to Webpage
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
          Upload an image and our AI will generate the HTML and CSS code to replicate its appearance as a webpage.
        </p>
      </header>

      <section className="w-full max-w-lg mb-8 md:mb-10">
        <ImageUpload onImageSelect={handleImageUpload} disabled={isLoading} inputId="image-upload-input" />
      </section>

      {isLoading && (
        <div className="flex flex-col items-center justify-center my-8 text-center">
          <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin text-accent mb-4" />
          <p className="font-body text-lg md:text-xl text-muted-foreground">
            AI is analyzing {currentFileName ? `"${currentFileName}"` : "your image"} and generating code...
          </p>
          <p className="font-body text-sm text-muted-foreground/80">(This may take some time)</p>
        </div>
      )}

      {error && !isLoading && (
        <Alert variant="destructive" className="w-full max-w-2xl my-8">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-headline text-lg">Oops! Something went wrong.</AlertTitle>
          <AlertDescription className="font-body">
            {error}
            <Button onClick={handleTryAgain} variant="link" className="p-0 h-auto ml-2 text-destructive-foreground">
              Try uploading another image?
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && generatedCode && !error && (
         <section className="w-full max-w-3xl mt-4 md:mt-8 p-6 bg-card rounded-xl shadow-md border border-border">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-2xl md:text-3xl font-headline text-primary">Generated Webpage Code</h2>
              <Button onClick={handleCopyToClipboard} variant="outline" size="sm">
                {hasCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {hasCopied ? 'Copied!' : 'Copy Code'}
              </Button>
            </div>
            <Textarea
              readOnly
              value={generatedCode}
              className="font-code text-sm h-96 resize-y border border-input bg-background/50 p-3 rounded-md"
              aria-label="Generated HTML and CSS code"
            />
            <div className="mt-4">
              <h3 className="text-lg font-headline text-primary mb-2">Preview:</h3>
              <div className="border border-border rounded-md overflow-hidden">
                <iframe
                  srcDoc={generatedCode}
                  title="Generated Webpage Preview"
                  className="w-full h-96"
                  sandbox="allow-same-origin" // Restrictive sandbox for security
                />
              </div>
            </div>
         </section>
      )}
      
      <footer className="w-full text-center mt-12 md:mt-16 py-6 border-t border-border">
        <p className="font-body text-sm text-muted-foreground">
          AI Image to Webpage &copy; {new Date().getFullYear()}. Powered by Generative AI.
        </p>
      </footer>
    </div>
  );
}
