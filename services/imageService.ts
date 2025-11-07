// services/imageService.ts

const DEFAULT_MAX_WIDTH = 1280;
const DEFAULT_MAX_HEIGHT = 1280;
const DEFAULT_JPEG_QUALITY = 0.8; // 80% quality is a good balance

/**
 * Resizes an image file, maintains aspect ratio, and converts it to a high-quality JPEG base64 string.
 * @param file The image file to resize.
 * @param maxWidth The maximum width for the output image.
 * @param quality The JPEG quality for the output image (0 to 1).
 * @returns A promise that resolves with the base64-encoded string of the resized image (without the data URL prefix).
 */
export const resizeImage = (
    file: File, 
    maxWidth: number = DEFAULT_MAX_WIDTH, 
    quality: number = DEFAULT_JPEG_QUALITY
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("FileReader did not return a result."));
            }

            const img = new Image();
            img.src = event.target.result as string;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Calculate the new dimensions to maintain aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    const maxHeight = maxWidth; // Assuming square-ish max dimensions for simplicity
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get 2D canvas context.'));
                }

                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Return just the base64 part of the data URL
                resolve(dataUrl.split(',')[1]);
            };

            img.onerror = (error) => reject(error);
        };

        reader.onerror = (error) => reject(error);
    });
};