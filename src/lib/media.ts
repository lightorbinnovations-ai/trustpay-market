const MAX_IMAGE_SIZE_BYTES = 100 * 1024; // 100KB

export async function compressImage(
    file: File,
    maxBytes: number = MAX_IMAGE_SIZE_BYTES
): Promise<File> {
    if (file.size <= maxBytes) return file;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;

                // Max dimensions
                const MAX_DIM = 1200;
                if (width > MAX_DIM || height > MAX_DIM) {
                    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(file);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Single pass compression to avoid hanging on mobile webviews
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

                // Convert dataUrl to File
                const arr = dataUrl.split(',');
                const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }

                const name = file.name.replace(/\.[^.]+$/, ".jpg");
                resolve(new File([u8arr], name, { type: mime }));
            };
            img.onerror = () => resolve(file);
            img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

/**
 * Basic video "compression" - mostly size checking for now as re-encoding requires heavy libraries.
 * We can implement a MediaRecorder-based re-encoder later if needed.
 */
export async function compressVideo(file: File): Promise<File> {
    const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size <= MAX_VIDEO_SIZE) return file;

    // For now, we just pass it through but log a warning.
    // Full re-encoding with MediaRecorder is a secondary path.
    console.warn("Video size exceeds 10MB limit. Compression not fully implemented for large videos.");
    return file;
}
