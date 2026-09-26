/**
 * Cache for dominant colors by image source to avoid re-extracting
 */
const colorCache = new Map<string, string>();

/**
 * Fast offscreen color extractor: samples image pixels to find the most vibrant dominant color
 */
export async function extractDominantColor(imageSrc: string): Promise<string | null> {
  if (!imageSrc) return null;
  if (colorCache.has(imageSrc)) {
    return colorCache.get(imageSrc) || null;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve(null);
            return;
          }

          // Sample at 32x32 for ultra-fast performance (<2ms)
          canvas.width = 32;
          canvas.height = 32;
          ctx.drawImage(img, 0, 0, 32, 32);

          const imageData = ctx.getImageData(0, 0, 32, 32);
          const data = imageData.data;

          let bestColor: { r: number; g: number; b: number } | null = null;
          let maxScore = -1;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 128) continue; // Skip semi-transparent pixels

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min; // Saturation indicator

            const brightness = (r + g + b) / 3;
            // Filter out near-blacks and near-whites
            if (brightness < 30 || brightness > 235) continue;

            // Score: prioritize high saturation, balanced lightness
            const score = delta * (1 - Math.abs(brightness - 128) / 128);

            if (score > maxScore) {
              maxScore = score;
              bestColor = { r, g, b };
            }
          }

          if (bestColor && maxScore > 20) {
            const hex = `#${((1 << 24) + (bestColor.r << 16) + (bestColor.g << 8) + bestColor.b)
              .toString(16)
              .slice(1)}`;
            colorCache.set(imageSrc, hex);
            resolve(hex);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = imageSrc;
    } catch {
      resolve(null);
    }
  });
}
