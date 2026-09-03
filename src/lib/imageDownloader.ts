import JSZip from 'jszip';
import { getAllPerekShiraImages, ImageDownloadItem } from './verseImages';

export interface DownloadProgress {
  total: number;
  completed: number;
  failed: number;
  currentTitle: string;
  percentage: number;
  phase: 'fetching' | 'compressing' | 'done' | 'error';
  errorMessage?: string;
}

/**
 * Loads an image through canvas as a fallback when direct fetch is restricted
 */
async function fetchImageViaCanvas(url: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          blob.arrayBuffer().then(resolve).catch(() => resolve(null));
        }, 'image/jpeg', 0.95);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Downloads a single image buffer with fallback strategies
 */
async function fetchImageBuffer(item: ImageDownloadItem): Promise<ArrayBuffer | null> {
  // Strategy 1: Fetch Full Quality URL directly
  try {
    const res = await fetch(item.fullQualityUrl, { mode: 'cors' });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 1000) {
        return buffer;
      }
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 2: Fetch standard URL
  try {
    const res = await fetch(item.url, { mode: 'cors' });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 1000) {
        return buffer;
      }
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 3: HTMLImageElement -> Canvas
  try {
    const canvasBuffer = await fetchImageViaCanvas(item.fullQualityUrl);
    if (canvasBuffer && canvasBuffer.byteLength > 1000) {
      return canvasBuffer;
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 4: Fallback Canvas on standard url
  try {
    const canvasBuffer = await fetchImageViaCanvas(item.url);
    if (canvasBuffer && canvasBuffer.byteLength > 1000) {
      return canvasBuffer;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

/**
 * Downloads all Perek Shira images in maximum resolution and saves them in a ZIP file
 */
export async function downloadAllPerekShiraImagesZip(
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const items = getAllPerekShiraImages();
  const total = items.length;
  const zip = new JSZip();

  let completed = 0;
  let failed = 0;

  onProgress?.({
    total,
    completed: 0,
    failed: 0,
    currentTitle: 'מתחיל הורדה...',
    percentage: 0,
    phase: 'fetching',
  });

  // Concurrency pool size of 5 for optimal download throughput without browser throttling
  const CONCURRENCY = 5;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      if (signal?.aborted) {
        throw new Error('Download aborted by user');
      }

      const item = items[currentIndex++];
      if (!item) break;

      onProgress?.({
        total,
        completed,
        failed,
        currentTitle: `${item.chapterHebrew}: ${item.title}`,
        percentage: Math.round(((completed + failed) / total) * 90),
        phase: 'fetching',
      });

      try {
        const buffer = await fetchImageBuffer(item);
        if (buffer) {
          const folder = zip.folder(item.folderName);
          if (folder) {
            folder.file(item.fileName, buffer);
          } else {
            zip.file(`${item.folderName}/${item.fileName}`, buffer);
          }
          completed++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
      }

      onProgress?.({
        total,
        completed,
        failed,
        currentTitle: `${item.chapterHebrew}: ${item.title}`,
        percentage: Math.round(((completed + failed) / total) * 90),
        phase: 'fetching',
      });
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker());
  await Promise.all(workers);

  if (signal?.aborted) {
    throw new Error('Download aborted by user');
  }

  // Phase: Compressing into ZIP
  onProgress?.({
    total,
    completed,
    failed,
    currentTitle: 'דוחס קבצים לקובץ ZIP...',
    percentage: 92,
    phase: 'compressing',
  });

  // Add README file inside ZIP with attribution and details
  zip.file(
    'קרא_אותי_פרק_שירה.txt',
    `פרק שירה - כל תמונות הבריאה באיכות מלאה (HD)
===================================================
קובץ זה מכיל את כל 92 תמונות הבריות והפרקים של פרק שירה.
התמונות מסודרות בתיקיות נפרדות לפי 6 פרקי השירה:
- פרק א: שמים וארץ, גן עדן וגיהנם, המדבר, השדות והמים
- פרק ב: היום והלילה, השמש והירח, הכוכבים והמטר
- פרק ג: אילנות היער, הגפן, התאנה, הרימון, והדשאים
- פרק ד: העופות, הדגים, הצפרדע ושאר בעלי הכנף
- פרק ה: הבהמות והחיות
- פרק ו: השרצים והכלבים

אתר פרק שירה: https://perek-shira.web.app
זכויות יוצרים: עמנואל זבולונוב, חברת ™sl@sh.
`
  );

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    },
    (metadata) => {
      onProgress?.({
        total,
        completed,
        failed,
        currentTitle: `דוחס לקובץ ZIP (${Math.round(metadata.percent)}%)...`,
        percentage: 90 + Math.round((metadata.percent / 100) * 10),
        phase: 'compressing',
      });
    }
  );

  if (signal?.aborted) {
    throw new Error('Download aborted by user');
  }

  // Trigger browser file download
  const blobUrl = URL.createObjectURL(zipBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = 'פרק_שירה_כל_התמונות_איכות_מלאה_HD.zip';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000);

  onProgress?.({
    total,
    completed,
    failed,
    currentTitle: 'ההורדה הושלמה בהצלחה!',
    percentage: 100,
    phase: 'done',
  });
}
