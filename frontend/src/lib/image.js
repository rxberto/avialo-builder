// Utilidades de imagen en el cliente.
// Redimensiona y recomprime una imagen ANTES de subirla para mantener el payload pequeño
// (típicamente 100-300 KB), evitando data URLs enormes y subidas lentas.

const MAX_DIMENSION = 1600; // lado mayor máximo en px
const QUALITY = 0.82;       // calidad JPEG/WebP

/** Tipos de imagen admitidos por el backend. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Lee un File de imagen, lo redimensiona si excede MAX_DIMENSION y devuelve un data URL
 * (JPEG, salvo PNG con transparencia que se conserva). Rechaza tipos no admitidos.
 * @param {File} file
 * @returns {Promise<string>} data URL listo para subir
 */
export function downscaleImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      reject(new Error('Formato no admitido. Usa JPG, PNG o WebP.'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // PNG conserva transparencia; el resto se recomprime a JPEG (más ligero).
        const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outType, QUALITY));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}
