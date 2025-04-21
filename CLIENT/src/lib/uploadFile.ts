import axios from "axios";

/**
 * Upload a file to the server
 * This function uploads a file to the server's /api/uploads endpoint
 */
export async function uploadFile(file: File): Promise<{
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}> {
  try {
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append("files", file);

    // For images, get dimensions
    if (file.type.startsWith("image/")) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = async () => {
          // Add image dimensions to the form data
          formData.append("width", img.width.toString());
          formData.append("height", img.height.toString());

          try {
            // Upload the file with dimensions
            const response = await axios.post(
              `${
                import.meta.env.VITE_API_URL || "http://localhost:3001/api"
              }/uploads`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );

            // Clean up the object URL
            URL.revokeObjectURL(objectUrl);

            // Return the first uploaded file's data
            const uploadedFile = response.data.data[0];
            resolve({
              id: uploadedFile.id,
              url: uploadedFile.url,
              fileName: uploadedFile.fileName,
              fileSize: uploadedFile.fileSize,
              mimeType: uploadedFile.mimeType,
              width: uploadedFile.width,
              height: uploadedFile.height,
            });
          } catch (error) {
            URL.revokeObjectURL(objectUrl);
            reject(error);
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          // If we can't load the image, upload without dimensions
          uploadWithoutMetadata(file, formData).then(resolve).catch(reject);
        };

        img.src = objectUrl;
      });
    } else if (file.type.startsWith("audio/")) {
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(file);

        audio.onloadedmetadata = async () => {
          // Add audio duration to the form data
          formData.append("duration", Math.round(audio.duration).toString());

          try {
            // Upload the file with duration
            const response = await axios.post(
              `${
                import.meta.env.VITE_API_URL || "http://localhost:3001/api"
              }/uploads`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );

            // Clean up the object URL
            URL.revokeObjectURL(objectUrl);

            // Return the first uploaded file's data
            const uploadedFile = response.data.data[0];
            resolve({
              id: uploadedFile.id,
              url: uploadedFile.url,
              fileName: uploadedFile.fileName,
              fileSize: uploadedFile.fileSize,
              mimeType: uploadedFile.mimeType,
              duration: uploadedFile.duration,
            });
          } catch (error) {
            URL.revokeObjectURL(objectUrl);
            reject(error);
          }
        };

        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          // If we can't load the audio, upload without duration
          uploadWithoutMetadata(file, formData).then(resolve).catch(reject);
        };

        audio.src = objectUrl;
      });
    } else {
      // For other file types, upload without additional metadata
      return uploadWithoutMetadata(file, formData);
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

// Helper function to upload a file without additional metadata
async function uploadWithoutMetadata(
  file: File,
  formData?: FormData
): Promise<{
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  try {
    // Create a FormData object if not provided
    const data = formData || new FormData();
    if (!formData) {
      data.append("files", file);
    }

    // Upload the file
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/uploads`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    // Return the first uploaded file's data
    const uploadedFile = response.data.data[0];
    return {
      id: uploadedFile.id,
      url: uploadedFile.url,
      fileName: uploadedFile.fileName,
      fileSize: uploadedFile.fileSize,
      mimeType: uploadedFile.mimeType,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

/**
 * Upload multiple files and return their metadata
 */
export async function uploadFiles(files: File[]): Promise<
  Array<{
    id: string;
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    width?: number;
    height?: number;
    duration?: number;
  }>
> {
  try {
    // Create a FormData object to send all files
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    // Upload all files at once
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/uploads`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    // Return the uploaded files' data
    return response.data.data;
  } catch (error) {
    console.error("Error uploading files:", error);

    // Fallback to uploading files one by one if batch upload fails
    console.log("Falling back to individual file uploads...");
    const uploadPromises = Array.from(files).map((file) => uploadFile(file));
    return Promise.all(uploadPromises);
  }
}

/**
 * Get the URL for a file
 * This function is now a simple pass-through since the server returns complete URLs
 */
export function getFileUrl(fileUrl: string): string {
  return fileUrl;
}
