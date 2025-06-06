'use client';
import React from 'react';
import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AlertTriangle, ImageOff } from 'lucide-react';

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
      // If imageUrl becomes null (e.g. user uploads a new file, old image is cleared)
      setIsImageLoadedByBrowser(false);
      setImageSrcError(false);
    }
  }, [imageUrl]);

  const handleImageError = () => {
    setIsImageLoadedByBrowser(false);
    setImageSrcError(true);
  };

  const handleImageLoad = () => {
    setIsImageLoadedByBrowser(true);
    setImageSrcError(false); 
  };

  const showSkeleton = isLoading || (imageUrl && !isImageLoadedByBrowser && !imageSrcError && !parentHasError);
  // Display error if NextImage itself failed, or if parent indicated an error and there's no imageUrl to even attempt loading.
  const displayErrorState = imageSrcError || (parentHasError && !imageUrl);

  return (
    <Card className={cn("w-full shadow-lg overflow-hidden flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="aspect-square w-full relative bg-muted/50 rounded-md overflow-hidden border border-border">
          {showSkeleton ? (
            <Skeleton className="h-full w-full" />
          ) : displayErrorState ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive font-body p-4 text-center">
              <AlertTriangle className="w-12 h-12 mb-2" />
              <p>{imageSrcError ? "Error loading image." : "Image not available."}</p>
            </div>
          ) : imageUrl ? (
            <NextImage
              src={imageUrl}
              alt={altText}
              fill
              style={{ objectFit: 'contain' }}
              className={cn(
                "transition-opacity duration-500 ease-in-out",
                isImageLoadedByBrowser ? "opacity-100" : "opacity-0"
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              unoptimized={!!(imageUrl && imageUrl.startsWith('data:'))}
              data-ai-hint={aiHint}
              priority={title === "Original Image"} // Prioritize loading the original image
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-body p-4 text-center">
              <ImageOff className="w-12 h-12 mb-2 text-muted-foreground/70" />
              <p>
                {title === "Original Image"
                  ? "Upload an image to view it here."
                  : "AI recreation will appear here."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
