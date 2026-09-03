import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';
import { AttachmentLink } from '../types';

export class StorageUploadService {
  /**
   * Determina o tipo do anexo baseado no mimeType e extensão do arquivo
   */
  public static getAttachmentType(mimeType: string, fileName: string): AttachmentLink['type'] {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return 'image';
    }
    if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
      return 'video';
    }
    if (
      mimeType === 'application/pdf' ||
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.includes('sheet') ||
      ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)
    ) {
      return 'document';
    }
    return 'other';
  }

  /**
   * Upload de arquivo para Firebase Storage com monitoramento de progresso
   */
  public static async uploadTaskAttachment(
    orgId: string,
    taskId: string,
    file: File,
    uploadedBy: string = 'Anônimo',
    onProgress?: (percent: number) => void
  ): Promise<AttachmentLink> {
    if (!isFirebaseConfigured || !storage) {
      // Fallback para URL local/base64 em modo offline ou demonstração
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const fakeLink: AttachmentLink = {
            id: 'att_local_' + Date.now().toString(36),
            title: file.name,
            url: reader.result as string,
            type: this.getAttachmentType(file.type, file.name),
            size: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
            uploadedBy,
          };
          if (onProgress) onProgress(100);
          resolve(fakeLink);
        };
        reader.readAsDataURL(file);
      });
    }

    // Sanitizar nome do arquivo para evitar caracteres especiais no caminho
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `organizations/${orgId}/tasks/${taskId}/${Date.now()}_${sanitizedName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        orgId,
        taskId,
        uploadedBy,
        originalName: file.name,
      },
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) {
            onProgress(percent);
          }
        },
        (error) => {
          console.error('Erro no upload de arquivo para Firebase Storage:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            const attachment: AttachmentLink = {
              id: 'att_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
              title: file.name,
              url: downloadUrl,
              type: StorageUploadService.getAttachmentType(file.type, file.name),
              size: file.size,
              mimeType: file.type,
              storagePath,
              uploadedAt: new Date().toISOString(),
              uploadedBy,
            };
            resolve(attachment);
          } catch (err) {
            console.error('Erro ao obter download URL do arquivo:', err);
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Deleta arquivo físico do Firebase Storage
   */
  public static async deleteAttachment(storagePath?: string): Promise<void> {
    if (!storagePath || !isFirebaseConfigured || !storage) return;

    try {
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
      console.log('✅ Arquivo deletado do Firebase Storage:', storagePath);
    } catch (e) {
      console.warn('Aviso ao deletar arquivo do Storage:', e);
    }
  }
}
