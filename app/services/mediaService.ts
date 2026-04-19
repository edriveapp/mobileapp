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
    console.log(`[MediaService] Attempting to upload to: ${api.defaults.baseURL}/media/upload`);
    console.log(`[MediaService] Local URI: ${uri}`);
    
    const response = await api.post<UploadResponse>(
      fieldName === "files" ? "/media/upload-multiple" : "/media/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // Increase timeout for large file uploads
      }
    );
    
    console.log(`[MediaService] Upload successful:`, response.data.url);
    return response.data.url;
  } catch (error: any) {
    console.error("[MediaService] Upload failed:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

/**
 * Helper to upload multiple files
 */
export const uploadMultipleFiles = async (uris: string[]): Promise<string[]> => {
  return Promise.all(uris.map((uri) => uploadFile(uri)));
};
