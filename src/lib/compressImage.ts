const MAX_SIZE_BYTES = 100 * 1024; // 100KB

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Failed to convert canvas to blob"));
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Compress an image file to a target max size (default 100KB).
 * Uses canvas to resize & re-encode as JPEG with decreasing quality.
 * Includes fallback for environments where OffscreenCanvas/createImageBitmap are unavailable.
 */
export async function compressImage(
  file: File,
  maxBytes: number = MAX_SIZE_BYTES
): Promise<File> {
  if (file.size <= maxBytes) return file;

  const MAX_DIM = 1200;
  let blob: Blob;

  try {
    const supportsBitmap = typeof createImageBitmap === "function";
    const supportsOffscreen = typeof OffscreenCanvas !== "undefined";

    if (supportsBitmap && supportsOffscreen) {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;

      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(bitmap, 0, 0, width, height);

      let quality = 0.8;
      do {
        blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
        quality -= 0.1;
      } while (blob.size > maxBytes && quality > 0.1);

      if (blob.size > maxBytes) {
        const scale = Math.sqrt(maxBytes / blob.size);
        const nw = Math.max(1, Math.round(width * scale));
        const nh = Math.max(1, Math.round(height * scale));
        const smallCanvas = new OffscreenCanvas(nw, nh);
        const sCtx = smallCanvas.getContext("2d");
        if (!sCtx) throw new Error("Canvas context unavailable");
        sCtx.drawImage(bitmap, 0, 0, nw, nh);
        blob = await smallCanvas.convertToBlob({ type: "image/jpeg", quality: 0.7 });
      }

      bitmap.close();
    } else {
      throw new Error("Using HTML canvas fallback");
    }
  } catch {
    const image = await fileToImage(file);
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > MAX_DIM || height > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, width, height);

    let quality = 0.8;
    do {
      blob = await canvasToBlob(canvas, quality);
      quality -= 0.1;
    } while (blob.size > maxBytes && quality > 0.1);

    if (blob.size > maxBytes) {
      const scale = Math.sqrt(maxBytes / blob.size);
      const nw = Math.max(1, Math.round(width * scale));
      const nh = Math.max(1, Math.round(height * scale));
      const smallCanvas = document.createElement("canvas");
      smallCanvas.width = nw;
      smallCanvas.height = nh;
      const sCtx = smallCanvas.getContext("2d");
      if (!sCtx) return file;
      sCtx.drawImage(image, 0, 0, nw, nh);
      blob = await canvasToBlob(smallCanvas, 0.7);
    }
  }

  const name = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([blob!], name, { type: "image/jpeg" });
}

