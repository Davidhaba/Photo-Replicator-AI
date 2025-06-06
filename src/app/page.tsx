'use client';

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ImageOff, Monitor, Code, UploadCloud, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateWebpageAction, type GenerateWebpageResult } from '@/app/actions';
import { ImageUpload } from '@/components/ImageUpload';

export default function HomePage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelected = (imageDataUri: string | null) => {
    if (imageDataUri) {
      setUploadedImage(imageDataUri);
      setGeneratedCode(null); // Clear previous code
      setError(null); // Clear previous error
      // Automatically submit if you want, or wait for a button click
      // handleSubmit(imageDataUri); 
    } else {
      setUploadedImage(null);
      setGeneratedCode(null);
      setError("No file selected or file reading error.");
    }
  };

  const handleSubmit = async () => {
    if (!uploadedImage) {
      setError("Please upload an image first.");
      toast({
        variant: "destructive",
        title: "No Image",
        description: "Please upload an image before generating.",
      });
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedCode(null);

    try {
      const result: GenerateWebpageResult = await generateWebpageAction(uploadedImage);
      
      let finalCode = result.generatedCode;
      // Remove Markdown code block delimiters if present
      if (finalCode) {
        const markdownBlockRegex = /^```html\s*([\s\S]*?)\s*```$/;
        const match = finalCode.trim().match(markdownBlockRegex);
        if (match && match[1]) {
          finalCode = match[1].trim();
        }
      }
      
      if (result.error) {
        setError(result.error);
        toast({
          variant: "destructive",
          title: "Generation Error",
          description: result.error,
        });
      } else if (finalCode) {
        setGeneratedCode(finalCode);
        toast({
          title: "Success!",
          description: "Webpage code generated. Check the preview and code tabs.",
        });
      } else {
        setError("AI did not return any content. Please try again.");
         toast({
          variant: "destructive",
          title: "Empty Response",
          description: "AI did not return any content. Please try again.",
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setError(null);
    setUploadedImage(null);
    setGeneratedCode(null);
    setActiveTab('preview');
    if (fileInputRef.current) {
      // This relies on ImageUpload component exposing its ref or a reset method
      // For simplicity, if direct ref manipulation is complex, user can re-select
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-100">
      <header className="sticky top-0 z-50 w-full border-b border-purple-700/50 bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
        <div className="container flex h-20 max-w-screen-xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center space-x-2">
            <Wand2 className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-headline bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              Pixel Perfect
            </h1>
          </div>
          <p className="text-sm text-purple-300 hidden md:block">AI Image to HTML/CSS Converter</p>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Image Upload and Original Image Preview */}
          <div className="flex flex-col gap-6">
            <Card className="bg-slate-800/70 border-purple-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-purple-300 flex items-center">
                  <UploadCloud className="mr-3 h-7 w-7 text-purple-400" /> Upload Your Design
                </CardTitle>
                <CardDescription className="text-purple-400/80">
                  Upload an image of a webpage, UI sketch, or mockup. Our AI will weave its magic.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload 
                  onImageSelect={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        handleImageSelected(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      handleImageSelected(null);
                    }
                  }} 
                  disabled={isLoading} 
                  inputId="page-image-upload"
                  ref={fileInputRef}
                />
                {uploadedImage && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3 text-purple-300">Original Image:</h3>
                    <div className="border-2 border-purple-600/50 rounded-lg overflow-hidden shadow-md bg-slate-700/50 p-2">
                      <img
                        src={uploadedImage}
                        alt="Uploaded design preview"
                        className="w-full h-auto object-contain max-h-[400px] rounded"
                        data-ai-hint="uploaded design screenshot"
                      />
                    </div>
                  </div>
                )}
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading || !uploadedImage}
                  className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      Generate Webpage
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Generated Code/Preview */}
          <div className="flex flex-col gap-6">
            <Card className="bg-slate-800/70 border-purple-700/50 shadow-xl h-full flex flex-col min-h-[500px] lg:min-h-[calc(100vh-15rem)]">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-purple-300">Generated Result</CardTitle>
                 <div className="flex border-b border-purple-700/30 mt-2">
                  <Button
                    variant={activeTab === 'preview' ? 'secondary' : 'ghost'}
                    onClick={() => setActiveTab('preview')}
                    className={`flex-1 py-3 rounded-none border-b-2 ${activeTab === 'preview' ? 'border-pink-500 text-pink-400 bg-slate-700/50' : 'border-transparent text-purple-300 hover:bg-slate-700/30 hover:text-purple-200'}`}
                  >
                    <Monitor className="mr-2 h-5 w-5" /> Preview
                  </Button>
                  <Button
                    variant={activeTab === 'code' ? 'secondary' : 'ghost'}
                    onClick={() => setActiveTab('code')}
                    className={`flex-1 py-3 rounded-none border-b-2 ${activeTab === 'code' ? 'border-pink-500 text-pink-400 bg-slate-700/50' : 'border-transparent text-purple-300 hover:bg-slate-700/30 hover:text-purple-200'}`}
                  >
                    <Code className="mr-2 h-5 w-5" /> HTML Code
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col p-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center flex-grow text-center p-6">
                    <Loader2 className="h-20 w-20 animate-spin text-purple-400 mb-6" />
                    <p className="font-body text-2xl text-purple-300">
                      Conjuring HTML from pixels...
                    </p>
                    <p className="font-body text-lg text-purple-400/80 mt-2">
                      This enchanted process may take a few moments.
                    </p>
                  </div>
                ) : error ? (
                  <div className="p-6">
                    <Alert variant="destructive" className="bg-red-900/30 border-red-700 text-red-300">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <AlertTitle className="font-headline text-lg text-red-200">Oh no, a wild error appeared!</AlertTitle>
                      <AlertDescription className="font-body text-red-300">
                        {error}
                        <Button onClick={handleTryAgain} variant="link" className="p-0 h-auto ml-2 text-red-200 hover:underline">
                          Try another image?
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : generatedCode ? (
                  <>
                    {activeTab === 'preview' ? (
                      <div className="flex-grow overflow-auto bg-white rounded-b-lg">
                        <iframe
                          srcDoc={generatedCode}
                          title="Generated Webpage Preview"
                          className="w-full h-full min-h-[400px] border-0"
                          sandbox="allow-scripts" 
                        />
                      </div>
                    ) : (
                      <div className="flex-grow overflow-auto bg-gray-950 p-4 rounded-b-lg">
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap break-all">
                          <code>{generatedCode}</code>
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-grow text-center text-purple-400/70 p-6">
                    <ImageOff className="w-20 h-20 mb-4" />
                    <p className="font-body text-xl">Your magically generated webpage will appear here.</p>
                    <p className="text-md mt-1">Upload an image to summon its HTML counterpart!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-8 border-t border-purple-700/30 bg-slate-900/80 mt-auto">
        <p className="font-body text-sm text-purple-400/70">
          Pixel Perfect &copy; {new Date().getFullYear()}. Woven with AI by Firebase Studio.
        </p>
      </footer>
    </div>
  );
}

    