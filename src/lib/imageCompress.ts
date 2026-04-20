/**
 * Compressão de imagem client-side antes do upload.
 *
 * Resolve dois problemas reais em campo:
 *  1) Câmeras modernas geram fotos de 5-12MB. Subir muitas em sequência pelo
 *     celular causava travamento/reload da WebView (out-of-memory).
 *  2) Uploads ficavam lentos e bloqueavam a UI.
 *
 * Estratégia: redimensiona mantendo proporção até `maxDim` no lado maior,
 * recodifica como JPEG com qualidade ajustável. Se algo falhar, devolve o
 * arquivo original — nunca quebra o fluxo de upload.
 */

const DEFAULT_MAX_DIM = 1600;
const DEFAULT_QUALITY = 0.82;

export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {},
): Promise<File> {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  // Não tenta comprimir não-imagens
  if (!file.type.startsWith("image/")) return file;
  // Pequeno demais para valer a pena
  if (file.size < 400 * 1024) return file;

  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = scaleDown(bitmap.width, bitmap.height, maxDim);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    // Se o resultado ficou maior que o original (raro), mantém o original.
    if (blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

async function loadBitmap(
  file: File,
): Promise<ImageBitmap | (HTMLImageElement & { close?: () => void })> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fallback abaixo
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaleDown(w: number, h: number, maxDim: number) {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const ratio = w > h ? maxDim / w : maxDim / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
