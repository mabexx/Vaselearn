
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts Firestore Timestamps in an object to ISO strings for JSON serialization.
 * This function recursively traverses the object/array.
 * @param data The data to process.
 * @returns A deep copy of the data with Timestamps converted to strings.
 */
function convertTimestampsToISO(data: any): any {
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(item => convertTimestampsToISO(item));
  }
  if (data !== null && typeof data === 'object' && Object.getPrototypeOf(data) === Object.prototype) {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newData[key] = convertTimestampsToISO(data[key]);
      }
    }
    return newData;
  }
  return data;
}


/**
 * Creates a JSON blob from an array of objects and triggers a download.
 * @param data The array of objects to export.
 * @param filename The name of the file to be downloaded.
 */
export function downloadJson(data: any, filename: string) {
  if (!data) {
    console.warn("Export aborted: data is empty.");
    return;
  }

  // Convert any Firestore Timestamps to ISO strings for proper JSON formatting
  const sanitizedData = convertTimestampsToISO(data);

  const jsonString = JSON.stringify(sanitizedData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

    