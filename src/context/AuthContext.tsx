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
  currentUser: User | null;
  users: User[];
  isLoadingAuth: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  setCurrentUser: (user: User | null) => void;
  switchUser: (userId: string) => void;
  loginWithGoogle: () => Promise<User | null>;
  loginWithEmail: (email: string, pass: string) => Promise<User>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
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
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: any) => {
        setIsLoadingAuth(true);
        if (fbUser) {
          try {
            const userObj = await FirestoreRepository.reconcileUserOnLogin(
              fbUser.uid,
              fbUser.email || '',
              fbUser.displayName || undefined,
              fbUser.photoURL || undefined
            );
            const updated = StorageService.updateUser(userObj);
            setUsers(updated);
            setCurrentUserState(userObj);
          } catch (err) {
            console.error('Erro ao sincronizar perfil do usuário autenticado:', err);
            const fallback: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
              email: fbUser.email || '',
              avatar: fbUser.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };
            setCurrentUserState(fallback);
          }
        } else {
          setCurrentUserState(null);
        }
        setIsLoadingAuth(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoadingAuth(false);
    }
  }, []);

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUserState(found);
    }
  };

  const loginWithGoogle = async (): Promise<User | null> => {
    setIsLoadingAuth(true);
    setAuthError(null);
    if (auth && googleProvider) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;
        const userObj = await FirestoreRepository.reconcileUserOnLogin(
          fbUser.uid,
          fbUser.email || '',
          fbUser.displayName || undefined,
          fbUser.photoURL || undefined
        );
        const updated = StorageService.updateUser(userObj);
        setUsers(updated);
        setCurrentUserState(userObj);
        return userObj;
      } catch (err: any) {
        console.warn('Google Auth Error:', err);
        const msg = getFirebaseAuthErrorMessage(err?.code || '');
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setIsLoadingAuth(false);
      }
    } else {
      setIsLoadingAuth(false);
      return currentUser;
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<User> => {
    setIsLoadingAuth(true);
    setAuthError(null);
    if (auth) {
      try {
        const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
        const fbUser = res.user;
        const userObj = await FirestoreRepository.reconcileUserOnLogin(
          fbUser.uid,
          fbUser.email || email.trim(),
          fbUser.displayName || undefined,
          fbUser.photoURL || undefined
        );
        const updated = StorageService.updateUser(userObj);
        setUsers(updated);
        setCurrentUserState(userObj);
        return userObj;
      } catch (err: any) {
        console.warn('Email Auth Error:', err);
        const msg = getFirebaseAuthErrorMessage(err?.code || '');
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setIsLoadingAuth(false);
      }
    } else {
      setIsLoadingAuth(false);
      throw new Error('Serviço de autenticação não inicializado.');
    }
  };

  const signUpWithEmail = async (name: string, email: string, pass: string): Promise<User> => {
    setIsLoadingAuth(true);
    setAuthError(null);
    if (auth) {
      try {
        const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        const fbUser = res.user;
        
        await updateProfile(fbUser, { displayName: name.trim() });

        const userObj = await FirestoreRepository.reconcileUserOnLogin(
          fbUser.uid,
          email.trim(),
          name.trim()
        );
        const updated = StorageService.updateUser(userObj);
        setUsers(updated);
        setCurrentUserState(userObj);
        return userObj;
      } catch (err: any) {
        console.warn('Sign Up Error:', err);
        const msg = getFirebaseAuthErrorMessage(err?.code || '');
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setIsLoadingAuth(false);
      }
    } else {
      setIsLoadingAuth(false);
      throw new Error('Serviço de autenticação não inicializado.');
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

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      ...data,
    };

    if (auth && auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: updatedUser.name,
          photoURL: updatedUser.avatar || null,
        });
      } catch (e) {
        console.warn('Erro ao atualizar perfil no Firebase Auth:', e);
      }
    }

    const updated = StorageService.updateUser(updatedUser);
    setUsers(updated);
    setCurrentUserState(updatedUser);
    await FirestoreRepository.syncUser(updatedUser);
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
    setCurrentUserState(null);
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
        updateUserProfile,
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
