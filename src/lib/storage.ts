
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { v4 as uuidv4 } from "uuid";

/**
 * Uploads a file to a specified path in Firebase Storage.
 * @param file The file to upload.
 * @param path The path in storage to upload the file to (e.g., 'avatars/userId').
 * @returns The public download URL of the uploaded file.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
    if (!storage) {
        throw new Error("Firebase Storage is not initialized.");
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const fullPath = `${path}/${fileName}`;
    const storageRef = ref(storage, fullPath);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
}
