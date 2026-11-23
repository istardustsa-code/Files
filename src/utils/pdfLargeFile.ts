import { PDFDocument } from 'pdf-lib';

// Safe threshold below Supabase Free tier's 50 MB per-object limit
export const SUPABASE_SAFE_SINGLE_OBJECT_BYTES = 42 * 1024 * 1024;
const HARD_BUCKET_CHUNK_LIMIT_BYTES = 47 * 1024 * 1024;

export interface PreparedLargeFileResult {
  files: File[];
  wasSplitPdf: boolean;
  totalPages?: number;
}

/**
 * Automatically splits huge 100+ page PDFs (> 42 MB) into sequential PDF parts
 * so they upload reliably even on Supabase's 50 MB storage limit and appear
 * together as ONE single bundled tile in the teacher's portfolio.
 */
export async function prepareFileForPortfolioUpload(
  file: File,
  maxSingleChunkBytes = SUPABASE_SAFE_SINGLE_OBJECT_BYTES
): Promise<PreparedLargeFileResult> {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf || file.size <= maxSingleChunkBytes) {
    return { files: [file], wasSplitPdf: false };
  }

  try {
    const buffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    if (totalPages <= 1) {
      return { files: [file], wasSplitPdf: false, totalPages };
    }

    const baseName = file.name.replace(/\.pdf$/i, '');
    const avgBytesPerPage = file.size / totalPages;
    const initialPagesPerChunk = Math.max(
      1,
      Math.floor((maxSingleChunkBytes * 0.85) / Math.max(1, avgBytesPerPage))
    );

    const parts: File[] = [];
    let cursor = 0;

    while (cursor < totalPages) {
      let batchCount = Math.min(initialPagesPerChunk, totalPages - cursor);
      let chunkBytes: Uint8Array | null = null;

      while (batchCount >= 1) {
        const subDoc = await PDFDocument.create();
        const pageIndices = Array.from({ length: batchCount }, (_, i) => cursor + i);
        const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((page) => subDoc.addPage(page));
        const saved = await subDoc.save({ useObjectStreams: true });

        if (saved.byteLength <= HARD_BUCKET_CHUNK_LIMIT_BYTES || batchCount === 1) {
          chunkBytes = saved;
          break;
        }

        // Batch had very heavy pages/scans; shrink page range and retry
        batchCount = Math.max(1, Math.floor(batchCount / 2));
      }

      if (!chunkBytes) {
        return { files: [file], wasSplitPdf: false, totalPages };
      }

      const startPage = cursor + 1;
      const endPage = cursor + batchCount;
      const partNumber = parts.length + 1;
      const partName = `${baseName} (جزء ${partNumber} — صفحات ${startPage}-${endPage}).pdf`;

      const arrayBufferCopy = new ArrayBuffer(chunkBytes.byteLength);
      new Uint8Array(arrayBufferCopy).set(chunkBytes);
      parts.push(new File([arrayBufferCopy], partName, { type: 'application/pdf' }));
      cursor = endPage;
    }

    return {
      files: parts.length > 0 ? parts : [file],
      wasSplitPdf: parts.length > 1,
      totalPages,
    };
  } catch {
    // If PDF cannot be parsed client-side (e.g. strict encryption), upload directly as-is
    return { files: [file], wasSplitPdf: false };
  }
}
