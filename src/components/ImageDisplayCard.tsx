'use client';
import React from 'react';
import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AlertTriangle, ImageOff, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon import

interface ImageDisplayCardProps {
  title: string;
  imageUrl: string | null;
  altText: string;
  isLoading?: boolean;
  hasError?: boolean; // Error from parent (e.g., API failure)
  className?: string;
  'data-ai-hint'?: string;
}

export function ImageDisplayCard({ title, imageUrl, altText, isLoading, hasError: parentHasError, className, 'data-ai-hint': aiHint }: ImageDisplayCardProps) {
  const [isImageLoadedByBrowser, setIsImageLoadedByBrowser] = React.useState(false);
  const [imageSrcError, setImageSrcError] = React.useState(false); // Error specific to loading this imageUrl

  React.useEffect(() => {
    if (imageUrl) {
      setIsImageLoadedByBrowser(false);
      setImageSrcError(false); // Reset src error when imageUrl changes
    } else {
      setIsImageLoadedByBrowser(false);
      setImageSrcError(false);
    }
  }, [imageUrl]);

  const handleImageError = () => {
    setIsImageLoadedByBrowser(true); // Consider it "loaded" to stop skeleton, but show error
    setImageSrcError(true);
  };

  const handleImageLoad = () => {
    setIsImageLoadedByBrowser(true);
    setImageSrcError(false);
  };

  const showSkeleton = isLoading && !isImageLoadedByBrowser && !imageSrcError;
  const displayErrorState = imageSrcError || (parentHasError && !imageUrl && !isLoading); // Show parent error if no image and not loading

  return (
    <Card className={cn("w-full shadow-xl bg-card/80 backdrop-blur-md border border-border/50 rounded-xl flex flex-col", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <ImageIcon className="mr-3 h-7 w-7" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full h-auto aspect-[4/3] relative bg-muted/30 rounded-lg overflow-hidden border border-border shadow-inner flex items-center justify-center">
          {showSkeleton && (
            <Skeleton className="absolute inset-0 h-full w-full" />
          )}
          {displayErrorState && !showSkeleton && (
            <div className="flex flex-col items-center justify-center h-full text-destructive font-body p-4 text-center">
              <AlertTriangle className="w-12 h-12 mb-2" />
              <p>{imageSrcError ? "Error loading image." : "Image not available."}</p>
            </div>
          )}
          {imageUrl && !imageSrcError && !parentHasError && (
            <NextImage
              key={imageUrl} // Re-render if URL changes
              src={imageUrl}
              alt={altText}
              layout="fill"
              objectFit="contain"
              className={cn(
                "transition-opacity duration-500 ease-in-out",
                isImageLoadedByBrowser ? "opacity-100" : "opacity-0"
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              unoptimized={imageUrl.startsWith('data:')}
              data-ai-hint={aiHint}
              priority={title === "Original Image"}
            />
          )}
          {!imageUrl && !isLoading && !displayErrorState && (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-body p-4 text-center">
              <ImageOff className="w-16 h-16 mb-3 text-muted-foreground/60" />
              <p className="text-sm">
                {title === "Original Image"
                  ? "No image uploaded yet."
                  : "AI recreation will appear here."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
