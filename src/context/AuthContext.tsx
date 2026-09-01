import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storageService';
import { FirestoreRepository } from '../services/firestoreRepository';
import { auth, googleProvider } from '../services/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

interface AuthContextType {
  currentUser: User;
  users: User[];
  isLoadingAuth: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  setCurrentUser: (user: User) => void;
  switchUser: (userId: string) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for friendly Firebase error messages in Portuguese
export const getFirebaseAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'O endereço de e-mail informado é inválido.';
    case 'auth/user-disabled':
      return 'Esta conta de usuário foi desativada pelo administrador.';
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este e-mail.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Senha incorreta ou credenciais inválidas.';
    case 'auth/email-already-in-use':
      return 'Já existe uma conta cadastrada com este e-mail.';
    case 'auth/weak-password':
      return 'A senha deve ter no mínimo 6 caracteres.';
    case 'auth/popup-closed-by-user':
      return 'A janela de autenticação do Google foi fechada.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Aguarde alguns instantes e tente novamente.';
    default:
      return 'Ocorreu um erro na autenticação. Verifique os dados e tente novamente.';
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    // Estado inicial: primeiro usuário do cache local.
    // O Firebase Auth (onAuthStateChanged abaixo) vai substituir este valor
    // com o usuário autenticado real assim que o SDK inicializar.
    const all = StorageService.getUsers();
    return all[0];
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: any) => {
        if (fbUser) {
          const allUsers = StorageService.getUsers();
          const existing = allUsers.find((u) => u.email.toLowerCase() === fbUser.email?.toLowerCase());
          
          if (existing) {
            const updatedUser: User = {
              ...existing,
              name: fbUser.displayName || existing.name,
              avatar: fbUser.photoURL || existing.avatar,
            };
            StorageService.updateUser(updatedUser);
            FirestoreRepository.syncUser(updatedUser);
            setCurrentUserState(updatedUser);
          } else {
            const newUser: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Novo Usuário',
              email: fbUser.email || '',
              avatar: fbUser.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };
            const updated = StorageService.addUser(newUser);
            setUsers(updated);
            FirestoreRepository.syncUser(newUser);
            setCurrentUserState(newUser);
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUserState(found);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    if (auth && googleProvider) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;
        const newUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Novo Usuário',
          email: fbUser.email || '',
          avatar: fbUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        const updated = StorageService.addUser(newUser);
        setUsers(updated);
        FirestoreRepository.syncUser(newUser);
        setCurrentUserState(newUser);
      } catch (err: any) {
        console.warn('Google Auth Error:', err);
        setAuthError(getFirebaseAuthErrorMessage(err?.code || ''));
        throw err;
      } finally {
        setIsLoadingAuth(false);
      }
    } else {
      setIsLoadingAuth(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    if (auth) {
      try {
        const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
        const fbUser = res.user;
        const allUsers = StorageService.getUsers();
        const existing = allUsers.find((u) => u.email.toLowerCase() === fbUser.email?.toLowerCase());
        if (existing) {
          setCurrentUserState(existing);
        }
      } catch (err: any) {
        console.warn('Email Auth Error:', err);
        const msg = getFirebaseAuthErrorMessage(err?.code || '');
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setIsLoadingAuth(false);
      }
    } else {
      // Local fallback for offline/demo
      const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        setCurrentUserState(found);
      } else {
        const msg = 'Usuário não encontrado.';
        setAuthError(msg);
        throw new Error(msg);
      }
      setIsLoadingAuth(false);
    }
  };

  const signUpWithEmail = async (name: string, email: string, pass: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    if (auth) {
      try {
        const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        const fbUser = res.user;
        
        // Update display name in Firebase Auth
        await updateProfile(fbUser, { displayName: name.trim() });

        const newUser: User = {
          id: fbUser.uid,
          name: name.trim(),
          email: email.trim(),
          createdAt: new Date().toISOString(),
        };

        const updated = StorageService.addUser(newUser);
        setUsers(updated);
        FirestoreRepository.syncUser(newUser);
        setCurrentUserState(newUser);
      } catch (err: any) {
        console.warn('Sign Up Error:', err);
        const msg = getFirebaseAuthErrorMessage(err?.code || '');
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setIsLoadingAuth(false);
      }
    } else {
      const newUser: User = {
        id: 'usr_' + Date.now().toString(36),
        name: name.trim(),
        email: email.trim(),
        createdAt: new Date().toISOString(),
      };
      const updated = StorageService.addUser(newUser);
      setUsers(updated);
      setCurrentUserState(newUser);
      setIsLoadingAuth(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    if (auth) {
      try {
        await sendPasswordResetEmail(auth, email.trim());
      } catch (err: any) {
        console.warn('Password Reset Error:', err);
        const msg = getFirebaseAuthErrorMessage(err?.code || '');
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setIsLoadingAuth(false);
      }
    } else {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    setIsLoadingAuth(true);
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    setIsLoadingAuth(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoadingAuth,
        authError,
        setAuthError,
        setCurrentUser: setCurrentUserState,
        switchUser,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
