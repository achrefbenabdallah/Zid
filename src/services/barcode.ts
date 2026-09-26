/**
 * Camera barcode scanning. Uses the native BarcodeDetector (Chrome/Android, fast) and
 * falls back to ZXing (iOS Safari, Firefox), which is lazy-loaded so it costs nothing otherwise.
 */

export interface ScanHandle {
  stop: () => void;
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (opts: { formats: string[] }) => NativeDetector;

export async function startScan(video: HTMLVideoElement, onCode: (code: string) => void): Promise<ScanHandle> {
  const Native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

  if (Native) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    await video.play();
    const detector = new Native({ formats: FORMATS });
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const found = await detector.detect(video);
        if (found[0]?.rawValue) {
          onCode(found[0].rawValue);
          return;
        }
      } catch {
        /* frame not ready */
      }
      setTimeout(tick, 200);
    };
    void tick();
    return {
      stop: () => {
        stopped = true;
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  }

  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader();
  let done = false;
  const controls = await reader.decodeFromConstraints(
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    video,
    (result) => {
      if (result && !done) {
        done = true;
        onCode(result.getText());
      }
    },
  );
  return { stop: () => controls.stop() };
}

export function cameraAvailable(): boolean {
  return !!navigator.mediaDevices?.getUserMedia;
}
