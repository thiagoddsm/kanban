import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface UploadProgressCallback {
  (progress: number): void;
}

export class StorageCloudService {
  /**
   * Upload an attachment or deliverable for a specific task in an organization
   */
  public static async uploadTaskAttachment(
    orgId: string,
    taskId: string,
    file: File
  ): Promise<{ url: string; fileName: string; size: number }> {
    if (!storage) {
      throw new Error('Firebase Storage não inicializado.');
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `organizations/${orgId}/tasks/${taskId}/${timestamp}_${sanitizedName}`;
    const fileRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(fileRef, file, {
      contentType: file.type,
      customMetadata: {
        orgId,
        taskId,
        originalName: file.name,
      },
    });

    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      fileName: file.name,
      size: file.size,
    };
  }

  /**
   * Upload an asset for a church event or project
   */
  public static async uploadEventAsset(
    orgId: string,
    eventId: string,
    file: File
  ): Promise<{ url: string; fileName: string; size: number }> {
    if (!storage) {
      throw new Error('Firebase Storage não inicializado.');
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `organizations/${orgId}/events/${eventId}/${timestamp}_${sanitizedName}`;
    const fileRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(fileRef, file, {
      contentType: file.type,
      customMetadata: {
        orgId,
        eventId,
        originalName: file.name,
      },
    });

    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      fileName: file.name,
      size: file.size,
    };
  }

  /**
   * Upload user avatar photo
   */
  public static async uploadUserAvatar(
    userId: string,
    file: File
  ): Promise<{ url: string }> {
    if (!storage) {
      throw new Error('Firebase Storage não inicializado.');
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `users/${userId}/avatar/${sanitizedName}`;
    const fileRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(fileRef, file, {
      contentType: file.type,
      customMetadata: {
        userId,
        originalName: file.name,
      },
    });

    const url = await getDownloadURL(snapshot.ref);
    return { url };
  }

  /**
   * Delete a file from Firebase Storage
   */
  public static async deleteFileByUrl(fileUrl: string): Promise<void> {
    if (!storage) return;
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Erro ao deletar arquivo do Storage:', err);
    }
  }
}
