
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UploadCloud, Copy, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Corrected import path
import NextImage from 'next/image';
import { generateWebpageAction } from './actions'; // Ensure this path is correct
import { ScrollArea } from '@/components/ui/scroll-area';

export default function HomePage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerationComplete, setIsGenerationComplete] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setGeneratedCode(null); // Clear previous generation
        setError(null); // Clear previous errors
        setIsGenerationComplete(false);
      };
      reader.readAsDataURL(file);
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
    setGeneratedCode(null); // Clear previous code
    setIsGenerationComplete(false);

    try {
      const result = await generateWebpageAction(originalImage);
      if (result.error) {
        setError(result.error);
        toast({
          title: "Generation Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        setGeneratedCode(result.generatedCode || "");
        setIsGenerationComplete(result.isComplete ?? true); // Assume complete if not specified
        toast({
          title: "Success!",
          description: "Webpage code generated.",
        });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({
        title: "Error",
        description: e.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
        .then(() => {
          toast({ title: "Success", description: "Code copied to clipboard!" });
        })
        .catch(err => {
          toast({ title: "Error", description: "Failed to copy code.", variant: "destructive" });
          console.error('Failed to copy text: ', err);
        });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-6xl mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-2">Photo Replicator</h1>
        <p className="text-lg text-muted-foreground font-body">
          Transform your images into code effortlessly. Upload a photo, and watch the AI recreate it.
        </p>
      </header>

      <main className="w-full max-w-6xl flex flex-col items-center gap-8">
        <Card className="w-full shadow-xl bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">Upload Your Image</CardTitle>
            <CardDescription className="font-body">
              Select an image file (PNG, JPG, WEBP, GIF) up to 5MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <Label
                htmlFor="image-upload"
                className="w-full md:w-2/3 h-64 border-2 border-dashed border-accent rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
              >
                {originalImage ? (
                  <NextImage src={originalImage} alt="Uploaded preview" width={200} height={200} className="max-h-full max-w-full object-contain rounded-md" />
                ) : (
                  <>
                    <UploadCloud className="w-16 h-16 text-accent" />
                    <p className="mt-2 text-muted-foreground font-body">Click or drag & drop to upload</p>
                  </>
                )}
              </Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleImageUpload}
                className="hidden"
                ref={fileInputRef}
              />
              <Button
                onClick={handleGenerateClick}
                disabled={!originalImage || isLoading}
                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-body py-3 px-6 text-lg rounded-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Code"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="w-full bg-destructive/10 border-destructive text-destructive-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Generating Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body">{error}</p>
            </CardContent>
          </Card>
        )}

        {(generatedCode || isLoading) && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-xl bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-2xl font-headline text-primary">Original Image</CardTitle>
              </CardHeader>
              <CardContent>
                {originalImage ? (
                  <div className="aspect-square w-full relative bg-muted/50 rounded-md overflow-hidden border border-border">
                    <NextImage
                      src={originalImage}
                      alt="Original Uploaded Image"
                      fill
                      style={{ objectFit: 'contain' }}
                      className="transition-opacity duration-500 ease-in-out opacity-100"
                      priority
                    />
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center h-64 text-muted-foreground font-body p-4 text-center">
                      <ImageIcon className="w-12 h-12 mb-2 text-muted-foreground/70" />
                      <p>No image uploaded yet.</p>
                    </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xl bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-2xl font-headline text-primary">AI Recreation</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="preview" className="font-body data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Preview</TabsTrigger>
                    <TabsTrigger value="code" className="font-body data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">HTML Code</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview">
                    <div className="aspect-square w-full relative bg-muted/50 rounded-md overflow-hidden border border-border">
                      {isLoading && !generatedCode && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
                          <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          <p className="mt-4 text-muted-foreground font-body">Generating preview...</p>
                        </div>
                      )}
                      {generatedCode && (
                        <iframe
                          srcDoc={generatedCode}
                          title="Generated Webpage Preview"
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-same-origin" // allow-same-origin might be needed for some CSS like web fonts, but be cautious
                        />
                      )}
                      {!isLoading && !generatedCode && !error && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-body p-4 text-center">
                          <ImageIcon className="w-12 h-12 mb-2 text-muted-foreground/70" />
                          <p>Generated preview will appear here.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="code">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 z-10"
                        onClick={handleCopyCode}
                        disabled={!generatedCode || isLoading}
                      >
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </Button>
                      <ScrollArea className="h-[300px] md:h-[400px] w-full rounded-md border p-4 bg-muted/50">
                        {isLoading && !generatedCode ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : generatedCode ? (
                          <pre className="text-sm font-code whitespace-pre-wrap break-all">
                            {generatedCode}
                          </pre>
                        ) : (
                          <p className="text-muted-foreground font-body">Generated code will appear here.</p>
                        )}
                      </ScrollArea>
                       {!isGenerationComplete && generatedCode && !isLoading && (
                         <p className="text-xs text-yellow-500 mt-2">Content might be truncated due to length. The AI will attempt to generate the full page in multiple steps if needed.</p>
                       )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="w-full max-w-6xl mt-12 text-center text-muted-foreground font-body">
        <p>&copy; {new Date().getFullYear()} Photo Replicator. All rights reserved.</p>
      </footer>
    </div>
  );
}
