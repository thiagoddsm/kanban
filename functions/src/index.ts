import * as admin from 'firebase-admin';

// Inicializa o app admin do Firebase (necessário para acessar Firestore, Auth, etc)
admin.initializeApp();

// Exporta as funções da pasta AI
export * from './ai';
