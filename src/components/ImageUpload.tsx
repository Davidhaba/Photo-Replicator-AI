'use client';
import React from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImageUploadProps {
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function ImageUpload({ onImageSelect, disabled }: ImageUploadProps) {
  const inputId = React.useId();
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Basic client-side validation for file type (though server should also validate)
      const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!acceptedTypes.includes(file.type)) {
        alert('Invalid file type. Please upload a PNG, JPG, or WEBP image.');
        event.target.value = ''; // Reset input
        return;
      }
      // Basic client-side validation for file size (e.g., 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5MB.');
        event.target.value = ''; // Reset input
        return;
      }
    }
    onImageSelect(event);
  };

  return (
    <div className="w-full flex flex-col items-center gap-4 p-6 border-2 border-dashed border-accent rounded-lg hover:border-primary transition-colors duration-300 bg-card shadow-sm">
      <UploadCloud className="w-12 h-12 md:w-16 md:h-16 text-accent" />
      <Label htmlFor={inputId} className="text-center font-body cursor-pointer">
        <span className="font-semibold text-primary text-lg">Click to upload an image</span>
        <p className="text-sm text-muted-foreground mt-1">PNG, JPG, WEBP (Max 5MB)</p>
      </Label>
      <Input
        id={inputId}
        type="file"
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
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
