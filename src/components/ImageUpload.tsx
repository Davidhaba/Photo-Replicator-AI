
'use client';
import React from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImageUploadProps {
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  inputId?: string; // Allow passing an ID for external label association or manipulation
}

export function ImageUpload({ onImageSelect, disabled, inputId: customInputId }: ImageUploadProps) {
  const defaultInputId = React.useId();
  const inputId = customInputId || defaultInputId;
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!acceptedTypes.includes(file.type)) {
        alert('Invalid file type. Please upload a PNG, JPG, WEBP, or GIF image.');
        event.target.value = ''; 
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File is too large. Maximum size is 5MB.');
        event.target.value = '';
        return;
      }
    }
    onImageSelect(event);
  };

  return (
    <div className="w-full flex flex-col items-center gap-4 p-6 border-2 border-dashed border-accent rounded-lg hover:border-primary transition-colors duration-300 bg-card shadow-sm">
      <UploadCloud className="w-12 h-12 md:w-16 md:h-16 text-accent" />
      <Label htmlFor={inputId} className="text-center font-body cursor-pointer">
        <span className="font-semibold text-primary text-lg">Click or drag to upload an image</span>
        <p className="text-sm text-muted-foreground mt-1">PNG, JPG, WEBP, GIF (Max 5MB)</p>
      </Label>
      <Input
        id={inputId}
        type="file"
        className="hidden" // Hidden by default, triggered by label/button
        accept="image/png, image/jpeg, image/webp, image/gif"
        onChange={handleFileChange}
        disabled={disabled}
        aria-label="Upload image"
      />
      <Button
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={disabled}
        variant="outline"
        className="font-body text-base"
        aria-label="Select image from device"
      >
        Select Image
      </Button>
    </div>
  );
}
