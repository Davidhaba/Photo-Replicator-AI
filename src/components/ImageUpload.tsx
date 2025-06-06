'use client';
import React, { forwardRef, useId, useState, useCallback, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, FileWarning, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  inputId?: string;
  currentImage?: string | null;
  onClearImage?: () => void;
}

export const ImageUpload = forwardRef<HTMLInputElement, ImageUploadProps>(
  ({ onImageSelect, disabled, inputId: customInputId, currentImage, onClearImage }, ref) => {
    const defaultInputId = useId();
    const inputId = customInputId || defaultInputId;
    const { toast } = useToast();
    const [dragOver, setDragOver] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      if (currentImage) {
        setIsImageLoaded(false); // Reset loading state when new image is selected
        setImageError(false);   // Reset error state
      } else {
        // Reset states if image is cleared
        setIsImageLoaded(false);
        setImageError(false);
      }
    }, [currentImage]);

    const handleImageLoad = () => {
      setIsImageLoaded(true);
      setImageError(false);
    };

    const handleImageLoadError = () => {
      setImageError(true);
      setIsImageLoaded(true); // Treat as loaded to stop spinner, error message will show
      toast({
        variant: "destructive",
        title: "Image Display Error",
        description: "Could not display the image preview. The file might be corrupted or an unsupported format.",
      });
    };

    const validateAndProceed = useCallback((file: File) => {
      const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      const maxSizeMB = 5;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (!acceptedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: `Please upload a PNG, JPG, WEBP, or GIF. You selected: ${file.type}`,
        });
        if (typeof ref === 'object' && ref && ref.current) {
          ref.current.value = '';
        }
        return false;
      }
      if (file.size > maxSizeBytes) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `Max file size is ${maxSizeMB}MB. Your file: ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
        });
         if (typeof ref === 'object' && ref && ref.current) {
          ref.current.value = '';
        }
        return false;
      }
      return true;
    }, [toast, ref]);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        if (validateAndProceed(file)) {
          onImageSelect(event);
        } else {
          // Clear the input if validation fails to allow re-selection
          if (typeof ref === 'object' && ref && ref.current) {
            ref.current.value = ""; 
          }
        }
      }
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) setDragOver(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(false);
      if (disabled || !event.dataTransfer.files || event.dataTransfer.files.length === 0) {
        return;
      }
      const file = event.dataTransfer.files[0];
      if (validateAndProceed(file)) {
         // Create a synthetic event that mimics a file input change event
        const syntheticEvent = {
          target: { files: event.dataTransfer.files } as unknown as EventTarget & HTMLInputElement // More precise type
        } as React.ChangeEvent<HTMLInputElement>;
        onImageSelect(syntheticEvent);

      } else {
        event.dataTransfer.clearData(); // Clear data if validation fails
      }
    };
    
    const internalClearImage = (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) {
        e.preventDefault(); // Prevent label click when button inside label is clicked
        e.stopPropagation(); // Stop event bubbling
      }
      if (onClearImage) {
        onClearImage();
      }
      // Reset the file input value more reliably
      if (typeof ref === 'object' && ref && ref.current) {
        ref.current.value = "";
      }
      setIsImageLoaded(false);
      setImageError(false);
    };

    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4"> {/* Increased max-width for better image preview */}
        <Label
          htmlFor={inputId}
          className={cn(
            "w-full aspect-video md:min-h-[300px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ease-in-out group relative overflow-hidden",
            disabled ? "bg-muted/50 cursor-not-allowed opacity-60" : "hover:border-primary/80 hover:bg-primary/5",
            dragOver ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2" : "border-border",
            currentImage && !imageError ? "p-0" : "p-6" // No padding when image is shown to use full space
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {currentImage && !imageError ? (
            <div className="relative w-full h-full">
              <NextImage 
                key={currentImage} 
                src={currentImage} 
                alt="Uploaded preview" 
                layout="fill" 
                objectFit="contain" 
                className={cn(
                  "transition-opacity duration-500 ease-in-out",
                  isImageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={handleImageLoad}
                onError={handleImageLoadError}
                unoptimized={true} 
                priority
              />
              {!isImageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              )}
              {!disabled && onClearImage && (
                <Button
                  type="button" // Important: type="button" to prevent form submission if inside a form
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-20 h-8 w-8 opacity-75 hover:opacity-100"
                  onClick={internalClearImage}
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : imageError ? (
             <div className="text-center pointer-events-none text-destructive flex flex-col items-center justify-center h-full p-4">
                <FileWarning className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3" />
                <p className="text-md font-semibold">Image Error</p>
                <p className="text-xs text-muted-foreground mt-1">Could not load preview. Try another image.</p>
                {!disabled && onClearImage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 z-10 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent label click
                    internalClearImage();
                  }}
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4 mr-1.5" /> Clear
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center pointer-events-none">
              <UploadCloud className={cn(
                "w-16 h-16 md:w-20 md:h-20 mx-auto mb-4", 
                dragOver ? "text-primary" : "text-muted-foreground group-hover:text-primary/80 transition-colors"
              )} />
              <p className="mt-3 text-lg font-semibold text-foreground">
                Drag & drop your image here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or <span className="text-primary font-medium">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground/80 mt-3">
                PNG, JPG, WEBP, GIF up to 5MB.
              </p>
            </div>
          )}
        </Label>
        <Input
          id={inputId}
          type="file"
          className="hidden"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          disabled={disabled}
          ref={ref}
        />
      </div>
    );
  }
);

ImageUpload.displayName = 'ImageUpload';
