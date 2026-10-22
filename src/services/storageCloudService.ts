import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface UploadProgressCallback {
  (progress: number): void;
}

import { sanitizeHeaderValue, getFileMimeType } from './storageUploadService';

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
    const resolvedMime = getFileMimeType(file);
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeOrgId = (orgId && orgId.trim() !== '') ? orgId.trim() : 'default_org';
    const safeTaskId = (taskId && taskId.trim() !== '') ? taskId.trim() : 'temp_task';
    const storagePath = `organizations/${safeOrgId}/tasks/${safeTaskId}/${timestamp}_${sanitizedName}`;
    const fileRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(fileRef, file, {
      contentType: resolvedMime,
      customMetadata: {
        orgId: sanitizeHeaderValue(safeOrgId),
        taskId: sanitizeHeaderValue(safeTaskId),
        originalName: sanitizeHeaderValue(file.name),
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
    const resolvedMime = getFileMimeType(file);
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeOrgId = (orgId && orgId.trim() !== '') ? orgId.trim() : 'default_org';
    const safeEventId = (eventId && eventId.trim() !== '') ? eventId.trim() : 'temp_event';
    const storagePath = `organizations/${safeOrgId}/events/${safeEventId}/${timestamp}_${sanitizedName}`;
    const fileRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(fileRef, file, {
      contentType: resolvedMime,
      customMetadata: {
        orgId: sanitizeHeaderValue(safeOrgId),
        eventId: sanitizeHeaderValue(safeEventId),
        originalName: sanitizeHeaderValue(file.name),
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

    const resolvedMime = getFileMimeType(file);
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeUserId = (userId && userId.trim() !== '') ? userId.trim() : 'unknown_user';
    const storagePath = `users/${safeUserId}/avatar/${sanitizedName}`;
    const fileRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(fileRef, file, {
      contentType: resolvedMime,
      customMetadata: {
        userId: sanitizeHeaderValue(safeUserId),
        originalName: sanitizeHeaderValue(file.name),
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
