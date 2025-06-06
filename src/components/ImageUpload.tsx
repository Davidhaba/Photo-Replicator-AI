'use client';
import React, { forwardRef } from 'react';
import { UploadCloud, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast'; // Assuming useToast is in hooks

interface ImageUploadProps {
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  inputId?: string;
}

export const ImageUpload = forwardRef<HTMLInputElement, ImageUploadProps>(
  ({ onImageSelect, disabled, inputId: customInputId }, ref) => {
    const defaultInputId = React.useId();
    const inputId = customInputId || defaultInputId;
    const { toast } = useToast();

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
            description: `Maximum file size is ${maxSizeMB}MB. Your file is ${(file.size / (1024*1024)).toFixed(2)}MB.`,
          });
          event.target.value = ''; // Reset the input
          return;
        }
      }
      onImageSelect(event);
    };

    return (
      <div className="w-full flex flex-col items-center gap-4 p-6 md:p-8 border-2 border-dashed border-purple-600/70 rounded-xl hover:border-purple-500 transition-colors duration-300 bg-slate-700/30 shadow-md hover:shadow-purple-500/20">
        <UploadCloud className="w-16 h-16 md:w-20 md:h-20 text-purple-400" />
        <Label htmlFor={inputId} className="text-center font-body cursor-pointer">
          <span className="font-semibold text-purple-300 text-xl block">Click or Drag & Drop</span>
          <p className="text-sm text-purple-400/80 mt-1">
            Supports PNG, JPG, WEBP, GIF (Max {5}MB)
          </p>
        </Label>
        <Input
          id={inputId}
          type="file"
          className="hidden"
          accept="image/png, image/jpeg, image/webp, image/gif"
          onChange={handleFileChange}
          disabled={disabled}
          ref={ref}
          aria-label="Upload image for webpage generation"
        />
        <Button
          onClick={() => document.getElementById(inputId)?.click()}
          disabled={disabled}
          variant="outline"
          className="font-body text-base bg-purple-600/80 hover:bg-purple-500 border-purple-500 text-white hover:text-white py-2 px-6 rounded-lg transition-all"
          aria-label="Select image from your device"
        >
          <UploadCloud className="mr-2 h-5 w-5" />
          Select Image
        </Button>
      </div>
    );
  }
);

ImageUpload.displayName = 'ImageUpload';

    