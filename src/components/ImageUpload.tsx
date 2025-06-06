'use client';
import React, { forwardRef, useId, useState } from 'react';
import { UploadCloud, FileWarning, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast'; // Corrected import path
import NextImage from 'next/image';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  inputId?: string;
  currentImage?: string | null; // Added to show preview within the component
  onClearImage?: () => void; // Optional: callback to clear the image
}

export const ImageUpload = forwardRef<HTMLInputElement, ImageUploadProps>(
  ({ onImageSelect, disabled, inputId: customInputId, currentImage, onClearImage }, ref) => {
    const defaultInputId = useId();
    const inputId = customInputId || defaultInputId;
    const { toast } = useToast();
    const [dragOver, setDragOver] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        const maxSizeMB = 5;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        if (!acceptedTypes.includes(file.type)) {
          toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: `Please upload a PNG, JPG, WEBP, or GIF image. You selected: ${file.type}`,
          });
          event.target.value = ''; // Reset the input
          return;
        }
        if (file.size > maxSizeBytes) {
          toast({
            variant: "destructive",
            title: "File Too Large",
            description: `Maximum file size is ${maxSizeMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
          });
          event.target.value = ''; // Reset the input
          return;
        }
      }
      onImageSelect(event);
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(true);
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
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const syntheticEvent = {
          target: { files: event.dataTransfer.files }
        } as unknown as React.ChangeEvent<HTMLInputElement>; // Type assertion
        handleFileChange(syntheticEvent);
        event.dataTransfer.clearData();
      }
    };
    
    const triggerFileInput = () => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.click();
      }
    };

    return (
      <div className="w-full flex flex-col items-center gap-4">
        <Label
          htmlFor={inputId}
          className={cn(
            "w-full p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ease-in-out",
            disabled ? "bg-muted/50 cursor-not-allowed" : "hover:border-primary/80 hover:bg-primary/5",
            dragOver ? "border-primary bg-primary/10" : "border-accent/50",
            currentImage ? "h-auto" : "h-64 md:h-72"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {currentImage ? (
            <div className="relative w-full max-w-xs aspect-video mx-auto">
              <NextImage src={currentImage} alt="Uploaded preview" layout="fill" objectFit="contain" className="rounded-md" />
              {!disabled && onClearImage && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md"
                  onClick={(e) => {
                    e.preventDefault(); // Prevent label click
                    onClearImage();
                    if (ref && 'current' in ref && ref.current) {
                        ref.current.value = ""; // Reset file input
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove image</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              <UploadCloud className={cn("w-16 h-16 md:w-20 md:h-20", dragOver ? "text-primary" : "text-accent/80")} />
              <p className="mt-3 text-lg font-medium text-foreground">
                Drag & drop your image here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse files
              </p>
              <p className="text-xs text-muted-foreground/80 mt-3">
                Supports: PNG, JPG, WEBP. Max 5MB.
              </p>
            </>
          )}
        </Label>
        <Input
          id={inputId}
          type="file"
          className="hidden"
          accept="image/png, image/jpeg, image/webp, image/gif" // GIF was in original, re-added for consistency if desired
          onChange={handleFileChange}
          disabled={disabled}
          ref={ref}
          aria-label="Upload image for webpage generation"
        />
        {!currentImage && (
          <Button
            type="button"
            onClick={triggerFileInput}
            disabled={disabled}
            variant="outline"
            className="font-body text-base py-2 px-6 rounded-lg transition-all border-primary/50 text-primary hover:bg-primary/10"
            aria-label="Select image from your device"
          >
            <ImageIcon className="mr-2 h-5 w-5" />
            Select Image
          </Button>
        )}
      </div>
    );
  }
);

ImageUpload.displayName = 'ImageUpload';