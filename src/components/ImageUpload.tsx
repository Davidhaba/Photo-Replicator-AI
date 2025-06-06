
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
        } else {
          // Clear the input if validation fails
          if (ref && typeof ref === 'object' && ref.current) {
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
        // Create a new FileList and assign it to the input to trigger onChange
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        if (ref && typeof ref === 'object' && ref.current) {
          ref.current.files = dataTransfer.files;
          // Manually trigger the change event
          const changeEvent = new Event('change', { bubbles: true });
          ref.current.dispatchEvent(changeEvent);
        }
      }
      event.dataTransfer.clearData();
    };
    
    const internalClearImage = (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (onClearImage) {
        onClearImage();
      }
      if (ref && typeof ref === 'object' && ref.current) {
        ref.current.value = "";
      }
    };

    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4">
        <Label
          htmlFor={inputId}
          className={cn(
            "w-full p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ease-in-out group relative", // Added relative positioning
            disabled ? "bg-muted/50 cursor-not-allowed opacity-60" : "hover:border-primary/80 hover:bg-primary/5",
            dragOver ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2" : "border-border",
            currentImage ? "min-h-[250px] md:min-h-[350px]" : "min-h-[200px] md:min-h-[250px]"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {currentImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="relative w-full flex-grow" style={{ maxHeight: 'calc(100% - 40px)' }}> {/* Adjusted for button space */}
                <NextImage 
                  src={currentImage} 
                  alt="Uploaded preview" 
                  layout="fill" 
                  objectFit="contain" 
                  className="rounded-md"
                />
              </div>
              {!disabled && onClearImage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 z-10" // Ensure button is above image if overlap occurs
                  onClick={internalClearImage}
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4 mr-1.5" /> Clear Image
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
          onChange={handleFileChange} // Use the modified handler
          disabled={disabled}
          ref={ref}
        />
      </div>
    );
  }
);

ImageUpload.displayName = 'ImageUpload';

    