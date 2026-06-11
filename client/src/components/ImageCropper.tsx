import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string, blob: Blob) => void;
  imageFile: File | null;
  aspectRatio?: number; // default 1 (square)
  title?: string;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({
  open,
  onClose,
  onCropComplete,
  imageFile,
  aspectRatio = 1,
  title = "画像をトリミング",
}: ImageCropperProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load image when file changes
  const loadImage = useCallback(() => {
    if (!imageFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
      setScale(1);
      setRotate(0);
      setCrop(undefined);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  }, [aspectRatio]);

  // Generate cropped canvas
  const getCroppedImg = useCallback(async (): Promise<{ url: string; blob: Blob } | null> => {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelRatio = window.devicePixelRatio;
    const outputSize = 400; // output 400x400 for avatars
    canvas.width = outputSize * pixelRatio;
    canvas.height = outputSize * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = "high";

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

    // Apply rotation
    const centerX = outputSize / 2;
    const centerY = outputSize / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    ctx.drawImage(
      image,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, outputSize, outputSize
    );
    ctx.restore();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Canvas is empty")); return; }
          const url = URL.createObjectURL(blob);
          resolve({ url, blob });
        },
        "image/jpeg",
        0.9
      );
    });
  }, [completedCrop, rotate, scale]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const result = await getCroppedImg();
      if (result) {
        onCropComplete(result.url, result.blob);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load image when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && imageFile) {
      loadImage();
    } else if (!isOpen) {
      setImgSrc("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-4">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {imgSrc ? (
            <>
              {/* Crop area */}
              <div className="flex justify-center bg-gray-50 rounded-xl overflow-hidden" style={{ maxHeight: "300px" }}>
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                  circularCrop={aspectRatio === 1}
                  minWidth={50}
                  minHeight={50}
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    style={{
                      transform: `scale(${scale}) rotate(${rotate}deg)`,
                      maxHeight: "280px",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                </ReactCrop>
              </div>

              {/* Zoom control */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Slider
                    min={0.5}
                    max={3}
                    step={0.05}
                    value={[scale]}
                    onValueChange={([v]) => setScale(v)}
                    className="flex-1"
                  />
                  <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">ズーム: {Math.round(scale * 100)}%</span>
                  <button
                    onClick={() => setRotate(r => (r + 90) % 360)}
                    className="flex items-center gap-1 text-xs text-primary"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    回転
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={onClose}>
                  キャンセル
                </Button>
                <Button
                  className="flex-1 rounded-xl h-10 gradient-luxury text-white"
                  onClick={handleConfirm}
                  disabled={isProcessing || !completedCrop}
                >
                  {isProcessing ? "処理中..." : "この範囲で設定"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              画像を読み込んでいます...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for avatar upload with crop
export function useAvatarCrop() {
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const openCropper = (file: File) => {
    setPendingFile(file);
    setCropOpen(true);
  };

  const closeCropper = () => {
    setCropOpen(false);
    setPendingFile(null);
  };

  return { cropOpen, pendingFile, openCropper, closeCropper };
}
