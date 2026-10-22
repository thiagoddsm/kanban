import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';
import { AttachmentLink } from '../types';

/**
 * Remove acentos e caracteres especiais para compatibilidade com headers HTTP (x-goog-meta-*)
 * O Google Cloud Storage e navegadores rejeitam caracteres não-ASCII em cabeçalhos HTTP.
 */
export function sanitizeHeaderValue(value: string): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos/acentos
    .replace(/[^\x20-\x7E]/g, '_')   // substitui não-ASCII imprimíveis por '_'
    .trim();
}

/**
 * Resolve o MIME type seguro do arquivo, prevenindo envio de contentType vazio
 */
export function getFileMimeType(file: File): string {
  if (file.type && file.type.trim() !== '') {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    // Imagens
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    psd: 'image/vnd.adobe.photoshop',
    ai: 'application/postscript',
    // Vídeos
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    // Áudios
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    // Documentos
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    // Compactados
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

export class StorageUploadService {
  /**
   * Determina o tipo do anexo baseado no mimeType e extensão do arquivo
   */
  public static getAttachmentType(mimeType: string, fileName: string): AttachmentLink['type'] {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'psd'].includes(ext)) {
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
      ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext)
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
    const resolvedMime = getFileMimeType(file);
    const safeOrgId = (orgId && orgId.trim() !== '') ? orgId.trim() : 'default_org';
    const safeTaskId = (taskId && taskId.trim() !== '') ? taskId.trim() : 'temp_task';

    if (!isFirebaseConfigured || !storage) {
      // Fallback para URL local/base64 em modo offline ou demonstração
      return new Promise((resolve) => {
        // Se arquivo > 800KB, usar blob URL para não estourar os limites de 1MB do Firestore / 5MB LocalStorage
        if (file.size > 800 * 1024) {
          const fakeLink: AttachmentLink = {
            id: 'att_local_' + Date.now().toString(36),
            title: file.name,
            url: URL.createObjectURL(file),
            type: this.getAttachmentType(resolvedMime, file.name),
            size: file.size,
            mimeType: resolvedMime,
            uploadedAt: new Date().toISOString(),
            uploadedBy,
          };
          if (onProgress) onProgress(100);
          resolve(fakeLink);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const fakeLink: AttachmentLink = {
            id: 'att_local_' + Date.now().toString(36),
            title: file.name,
            url: reader.result as string,
            type: this.getAttachmentType(resolvedMime, file.name),
            size: file.size,
            mimeType: resolvedMime,
            uploadedAt: new Date().toISOString(),
            uploadedBy,
          };
          if (onProgress) onProgress(100);
          resolve(fakeLink);
        };
        reader.onerror = () => {
          // Fallback seguro em caso de falha de leitura
          const fakeLink: AttachmentLink = {
            id: 'att_local_' + Date.now().toString(36),
            title: file.name,
            url: URL.createObjectURL(file),
            type: this.getAttachmentType(resolvedMime, file.name),
            size: file.size,
            mimeType: resolvedMime,
            uploadedAt: new Date().toISOString(),
            uploadedBy,
          };
          if (onProgress) onProgress(100);
          resolve(fakeLink);
        };
        reader.readAsDataURL(file);
      });
    }

    // Sanitizar nome do arquivo para evitar caracteres especiais no caminho do Storage
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `organizations/${safeOrgId}/tasks/${safeTaskId}/${Date.now()}_${sanitizedName}`;
    const storageRef = ref(storage, storagePath);

    // Sanitizar metadados customizados para ASCII limpo (evita erro ByteString/HTTP header no browser)
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: resolvedMime,
      customMetadata: {
        orgId: sanitizeHeaderValue(safeOrgId),
        taskId: sanitizeHeaderValue(safeTaskId),
        uploadedBy: sanitizeHeaderValue(uploadedBy),
        originalName: sanitizeHeaderValue(file.name),
      },
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const percent = snapshot.totalBytes > 0 
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
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
              title: file.name, // Mantém o nome original com acentuação no objeto da tarefa
              url: downloadUrl,
              type: StorageUploadService.getAttachmentType(resolvedMime, file.name),
              size: file.size,
              mimeType: resolvedMime,
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
