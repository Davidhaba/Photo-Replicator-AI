
'use client';
import React, { forwardRef, useId, useState, useCallback, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, FileWarning, Loader2 } from 'lucide-react'; // Added Loader2 and FileWarning
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
      setIsImageLoaded(false); // Ensure loader stops
      toast({
        variant: "destructive",
        title: "Помилка відображення",
        description: "Не вдалося завантажити попередній перегляд зображення. Спробуйте інше.",
      });
    };

    const validateAndProceed = useCallback((file: File) => {
      const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      const maxSizeMB = 5;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (!acceptedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Невірний тип файлу",
          description: `Будь ласка, завантажте PNG, JPG, WEBP, або GIF. Ви обрали: ${file.type}`,
        });
        if (typeof ref === 'object' && ref && ref.current) {
          ref.current.value = '';
        }
        return false;
      }
      if (file.size > maxSizeBytes) {
        toast({
          variant: "destructive",
          title: "Файл занадто великий",
          description: `Максимальний розмір файлу ${maxSizeMB}MB. Ваш файл: ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
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
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        if (typeof ref === 'object' && ref && ref.current) {
          ref.current.files = dataTransfer.files;
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
      if (typeof ref === 'object' && ref && ref.current) {
        ref.current.value = "";
      }
      setIsImageLoaded(false);
      setImageError(false);
    };

    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4">
        <Label
          htmlFor={inputId}
          className={cn(
            "w-full p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ease-in-out group relative",
            disabled ? "bg-muted/50 cursor-not-allowed opacity-60" : "hover:border-primary/80 hover:bg-primary/5",
            dragOver ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2" : "border-border",
            currentImage || imageError ? "min-h-[300px] md:min-h-[400px]" : "min-h-[200px] md:min-h-[250px]"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {currentImage && !imageError ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="relative w-full flex-grow mb-3 bg-muted/10 rounded-md overflow-hidden">
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
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                )}
              </div>
              {!disabled && onClearImage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="z-10" 
                  onClick={internalClearImage}
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4 mr-1.5" /> Clear Image
                </Button>
              )}
            </div>
          ) : imageError ? (
             <div className="text-center pointer-events-none text-destructive flex flex-col items-center justify-center h-full">
                <FileWarning className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4" />
                <p className="mt-3 text-lg font-semibold">Помилка завантаження зображення</p>
                <p className="text-sm text-muted-foreground mt-1">Будь ласка, спробуйте інше зображення.</p>
                {!disabled && onClearImage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 z-10 pointer-events-auto" // Make button clickable
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent label click
                    internalClearImage();
                  }}
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4 mr-1.5" /> Очистити
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
                Перетягніть зображення сюди
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                або <span className="text-primary font-medium">натисніть для вибору</span>
              </p>
              <p className="text-xs text-muted-foreground/80 mt-3">
                Підтримувані формати: PNG, JPG, WEBP, GIF. Макс. 5MB.
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
