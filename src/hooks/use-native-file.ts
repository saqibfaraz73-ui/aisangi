import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

/**
 * Utility hook for native file operations via Capacitor Filesystem.
 * Falls back to browser file APIs on web.
 */

const isNative = () => Capacitor.isNativePlatform();

/** Pick a file using native file input or SAF intent */
export async function pickFile(accept = "*/*"): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      resolve(file);
    };
    input.click();
  });
}

/** Pick multiple files */
export async function pickFiles(accept = "*/*"): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = true;
    input.onchange = () => {
      resolve(Array.from(input.files ?? []));
    };
    input.click();
  });
}

/** Save a blob/file to device storage with a custom name and folder */
export async function saveFileToDevice(
  data: Blob | string,
  fileName: string,
  subfolder?: string
): Promise<string | null> {
  if (isNative()) {
    try {
      let base64Data: string;

      if (typeof data === "string") {
        // Already a data-url or base64 string
        base64Data = data.includes(",") ? data.split(",")[1] : data;
      } else {
        // Convert blob to base64
        base64Data = await blobToBase64(data);
      }

      const path = subfolder ? `${subfolder}/${fileName}` : fileName;

      const result = await Filesystem.writeFile({
        path,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      toast.success(`Saved to Documents/${path}`);
      return result.uri;
    } catch (e: any) {
      console.error("Native save failed", e);
      // Fallback: try external storage
      try {
        const base64Data =
          typeof data === "string"
            ? data.includes(",")
              ? data.split(",")[1]
              : data
            : await blobToBase64(data);

        const path = subfolder ? `${subfolder}/${fileName}` : fileName;

        const result = await Filesystem.writeFile({
          path,
          data: base64Data,
          directory: Directory.ExternalStorage,
          recursive: true,
        });

        toast.success(`Saved to ${path}`);
        return result.uri;
      } catch (e2: any) {
        console.error("External save also failed", e2);
        toast.error("Could not save file: " + (e2.message || "Permission denied"));
        return null;
      }
    }
  } else {
    // Web fallback — trigger download
    const blob = typeof data === "string" ? dataUrlToBlob(data) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${fileName}`);
    return fileName;
  }
}

/** Read a file from device storage */
export async function readFileFromDevice(
  path: string,
  directory: Directory = Directory.Documents
): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const result = await Filesystem.readFile({
      path,
      directory,
    });
    return result.data as string;
  } catch (e) {
    console.error("Read failed", e);
    return null;
  }
}

/** List files in a directory */
export async function listFiles(
  path = "",
  directory: Directory = Directory.Documents
): Promise<string[]> {
  if (!isNative()) return [];
  try {
    const result = await Filesystem.readdir({
      path,
      directory,
    });
    return result.files.map((f) => f.name);
  } catch {
    return [];
  }
}

/** Create a folder on device */
export async function createFolder(
  path: string,
  directory: Directory = Directory.Documents
): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await Filesystem.mkdir({ path, directory, recursive: true });
    return true;
  } catch {
    return false;
  }
}

/** Delete a file from device */
export async function deleteFile(
  path: string,
  directory: Directory = Directory.Documents
): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await Filesystem.deleteFile({ path, directory });
    return true;
  } catch {
    return false;
  }
}

/** Rename/move a file on device */
export async function renameFile(
  oldPath: string,
  newPath: string,
  directory: Directory = Directory.Documents
): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await Filesystem.rename({
      from: oldPath,
      to: newPath,
      directory,
      toDirectory: directory,
    });
    return true;
  } catch (e) {
    console.error("Rename failed", e);
    return false;
  }
}

// ---- Helpers ----

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
