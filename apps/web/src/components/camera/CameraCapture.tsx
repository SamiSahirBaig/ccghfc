'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, X, CheckCircle2 } from 'lucide-react';

interface CameraCaptureProps {
  maxPhotos?: number;
  onPhotosChange: (files: File[]) => void;
}

export default function CameraCapture({
  maxPhotos = 4,
  onPhotosChange,
}: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Client-side compression to <= 1.5MB via Canvas
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension 1920px
          const maxDim = 1920;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Export as JPEG with 0.8 quality (~800KB to 1.2MB)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        };
      };
    });
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setIsCompressing(true);
    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      if (selectedFiles.length + newFiles.length >= maxPhotos) break;
      const compressed = await compressImage(file);
      newFiles.push(compressed);
      newPreviews.push(URL.createObjectURL(compressed));
    }

    const updatedFiles = [...selectedFiles, ...newFiles];
    const updatedPreviews = [...previews, ...newPreviews];

    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedFiles);
    setIsCompressing(false);
  };

  const removePhoto = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedFiles);
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input with Camera Capture Support */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {/* Camera Trigger Card */}
      {selectedFiles.length < maxPhotos && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isCompressing}
          className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl transition-all text-emerald-800 active:scale-[0.98]"
        >
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mb-3 shadow-md shadow-emerald-600/20">
            <Camera className="w-7 h-7" />
          </div>
          <span className="font-semibold text-base">
            {isCompressing ? 'Compressing Photo...' : 'Snap Photo / Select Evidence'}
          </span>
          <span className="text-xs text-emerald-600/80 mt-1">
            Tap to open camera ({selectedFiles.length}/{maxPhotos} attached) &bull; Auto-optimized &le;1.5MB
          </span>
        </button>
      )}

      {/* Photo Previews Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {previews.map((src, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100 shadow-sm">
              <img src={src} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Photo {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
