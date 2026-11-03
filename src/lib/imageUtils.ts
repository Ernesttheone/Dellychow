/**
 * Utility to process and resize images selected from a user's or chef's local device.
 * Scales down large device camera photos so they fit smoothly into Firebase
 * and load instantly on all mobile and desktop screens.
 */
export async function processDeviceImage(file: File, maxDimension = 360, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not a valid image format.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read selected image file.'));
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('Empty image payload'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image from device.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
