'use client';
import React from 'react';
import NextImage from 'next/image'; // Renamed to avoid conflict with global Image
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AlertTriangle, ImageOff } from 'lucide-react';

interface ImageDisplayCardProps {
  title: string;
  imageUrl: string | null;
  altText: string;
  isLoading?: boolean; // True if parent is loading data for this card
  hasError?: boolean; // True if there was an error fetching/generating this image
  className?: string;
  'data-ai-hint'?: string;
}

export function ImageDisplayCard({ title, imageUrl, altText, isLoading, hasError, className, 'data-ai-hint': aiHint }: ImageDisplayCardProps) {
  const [isImageLoadedByBrowser, setIsImageLoadedByBrowser] = React.useState(false);

  React.useEffect(() => {
    // Reset browser loading state when imageUrl changes
    if (imageUrl) {
      setIsImageLoadedByBrowser(false);
    }
  }, [imageUrl]);

  const showSkeleton = isLoading || (imageUrl && !isImageLoadedByBrowser && !hasError);

  return (
    <Card className={cn("w-full shadow-lg overflow-hidden flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="aspect-square w-full relative bg-muted/50 rounded-md overflow-hidden border border-border">
          {showSkeleton ? (
            <Skeleton className="h-full w-full" />
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive font-body p-4 text-center">
              <AlertTriangle className="w-12 h-12 mb-2" />
              <p>Could not load image.</p>
            </div>
          ) : imageUrl ? (
            <NextImage
              src={imageUrl}
              alt={altText}
              layout="fill"
              objectFit="contain"
              className={cn(
                "transition-opacity duration-500 ease-in-out",
                isImageLoadedByBrowser ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setIsImageLoadedByBrowser(true)}
              onError={() => { /* Could set an error state here if needed */ }}
              unoptimized={imageUrl.startsWith('data:')} 
              data-ai-hint={aiHint}
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
