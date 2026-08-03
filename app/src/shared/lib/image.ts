/**
 * Redimensiona y comprime una imagen del navegador a un data URI pequeño, apto
 * para guardarse dentro de un documento Firestore (sin usar Storage, de pago).
 * Mantiene la proporción dentro de un cuadro de `maxSize` px. Devuelve PNG si el
 * origen es PNG (conserva transparencia del logo), si no JPEG comprimido.
 */
export function resizeImageToDataUrl(file: Blob, maxSize = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const isPng = file.type === 'image/png';
      resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Archivo de imagen inválido'));
    };
    img.src = url;
  });
}
