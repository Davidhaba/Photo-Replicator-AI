'use client';
import React, { forwardRef, useId, useState, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, X, FileWarning } from 'lucide-react';
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
        if (ref && typeof ref === 'object' && ref.current) {
          ref.current.value = ''; // Reset the input
        }
        return false;
      }
      if (file.size > maxSizeBytes) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `Maximum file size is ${maxSizeMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
        });
         if (ref && typeof ref === 'object' && ref.current) {
          ref.current.value = ''; // Reset the input
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
        const syntheticEvent = {
          target: { files: event.dataTransfer.files }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onImageSelect(syntheticEvent);
      }
      event.dataTransfer.clearData();
    };
    
    const triggerFileInput = () => {
      if (ref && typeof ref === 'object' && ref.current) {
        ref.current.click();
      }
    };

    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4">
        <Label
          htmlFor={inputId}
          className={cn(
            "w-full p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ease-in-out group",
            disabled ? "bg-muted/50 cursor-not-allowed opacity-60" : "hover:border-primary/80 hover:bg-primary/5",
            dragOver ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2" : "border-border",
            currentImage ? "min-h-[200px] md:min-h-[300px] aspect-auto" : "min-h-[200px] md:min-h-[250px]"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && triggerFileInput()} // Make the whole label clickable
        >
          {currentImage ? (
            <div className="relative w-full h-full max-h-[400px] flex items-center justify-center">
              <NextImage 
                src={currentImage} 
                alt="Uploaded preview" 
                layout="intrinsic" // Use intrinsic to maintain aspect ratio within the container
                width={500} // Provide a base width, Next.js will optimize
                height={300} // Provide a base height
                objectFit="contain" 
                className="rounded-md" 
              />
              {!disabled && onClearImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-75 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent label click from re-opening file dialog
                    if (onClearImage) onClearImage();
                    if (ref && typeof ref === 'object' && ref.current) {
                        ref.current.value = "";
                    }
                  }}
                  aria-label="Remove image"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center pointer-events-none"> {/* Prevent text selection during drag */}
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
                Supports: PNG, JPG, WEBP, GIF. Max 5MB.
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
