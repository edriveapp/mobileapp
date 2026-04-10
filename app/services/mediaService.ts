import api from "./api";
import { Platform } from "react-native";

export interface UploadResponse {
  url: string;
}

/**
 * Uploads a local file to the backend and returns the public URL.
 * @param uri The local file:/// URI
 * @param fieldName The field name (default: 'file')
 */
export const uploadFile = async (
  uri: string,
  fieldName: string = "file"
): Promise<string> => {
  if (!uri) throw new Error("No URI provided for upload");

  // If it's already a web URL, return it as is
  if (uri.startsWith("http")) return uri;

  const formData = new FormData();
  
  // Format the file object for FormData
  const filename = uri.split("/").pop() || "upload.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append(fieldName, {
    uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
    name: filename,
    type,
  } as any);

  try {
    const response = await api.post<UploadResponse>(
      fieldName === "files" ? "/media/upload-multiple" : "/media/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.url;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};

/**
 * Helper to upload multiple files
 */
export const uploadMultipleFiles = async (uris: string[]): Promise<string[]> => {
  return Promise.all(uris.map((uri) => uploadFile(uri)));
};
