import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyADLqvQVfPzG6PS5jxiU9OKNZdzzJ3Bx3I",
  authDomain: "studio-5589719834-7481b.firebaseapp.com",
  projectId: "studio-5589719834-7481b",
  storageBucket: "studio-5589719834-7481b.firebasestorage.app",
  messagingSenderId: "170591764605",
  appId: "1:170591764605:web:02413eac486766efca3114"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INITIAL_ORGANIZATIONS = [
  {
    id: 'org_ibm',
    name: 'Igreja Batista Memorial (IBM)',
    slug: 'ibm',
    branding: {
      primaryColor: '#4f46e5',
      secondaryColor: '#818cf8',
    },
    subscription: {
      organizationId: 'org_ibm',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      currentPeriodStart: '2026-01-01T00:00:00Z',
      currentPeriodEnd: '2027-01-01T00:00:00Z',
    },
    limits: {
      maxMembers: 100,
      maxCampuses: 20,
      maxEvents: 500,
      maxTasks: 5000,
      storageGB: 500,
      customBranding: true,
      advancedReports: true,
      gantt: true,
      apiAccess: true,
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-08-24T00:00:00Z',
  },
  {
    id: 'org_comunidade',
    name: 'Comunidade da Fé',
    slug: 'comunidade-fe',
    branding: {
      primaryColor: '#059669',
      secondaryColor: '#34d399',
    },
    subscription: {
      organizationId: 'org_comunidade',
      plan: 'PRO',
      status: 'ACTIVE',
      currentPeriodStart: '2026-01-01T00:00:00Z',
      currentPeriodEnd: '2027-01-01T00:00:00Z',
    },
    limits: {
      maxMembers: 30,
      maxCampuses: 5,
      maxEvents: 100,
      maxTasks: 1000,
      storageGB: 50,
      customBranding: true,
      advancedReports: true,
      gantt: true,
      apiAccess: false,
    },
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-08-24T00:00:00Z',
  }
];

const INITIAL_CAMPUSES = [
  {
    id: 'camp_ibm_sede',
    organizationId: 'org_ibm',
    name: 'Campus Sede (Central)',
    code: 'SEDE',
    city: 'São Paulo - SP',
    address: 'Av. Paulista, 1000',
    isMainCampus: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'camp_ibm_alphaville',
    organizationId: 'org_ibm',
    name: 'Campus Alphaville',
    code: 'ALPH',
    city: 'Barueri - SP',
    address: 'Al. Rio Negro, 500',
    isMainCampus: false,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'camp_ibm_sul',
    organizationId: 'org_ibm',
    name: 'Campus Zona Sul',
    code: 'ZSUL',
    city: 'São Paulo - SP',
    address: 'Av. Washington Luís, 2500',
    isMainCampus: false,
    createdAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'camp_com_sede',
    organizationId: 'org_comunidade',
    name: 'Campus Principal',
    code: 'SEDE',
    city: 'Campinas - SP',
    isMainCampus: true,
    createdAt: '2026-02-01T00:00:00Z',
  }
];

const INITIAL_USERS = [
  {
    id: 'usr_admin',
    name: 'Pr. Carlos Mendes',
    email: 'carlos.mendes@marketingibm.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr_leader',
    name: 'Mariana Lima',
    email: 'mariana.lima@marketingibm.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'usr_team_lucas',
    name: 'Lucas Designer',
    email: 'lucas.designer@marketingibm.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: '2026-01-10T00:00:00Z',
  }
];

async function seed() {
  console.log('🌱 Semeando dados no Cloud Firestore...');

  // 1. Organizations
  for (const org of INITIAL_ORGANIZATIONS) {
    await setDoc(doc(db, 'organizations', org.id), org, { merge: true });
    console.log(`✓ Organização criada: ${org.name} (${org.id})`);
  }

  // 2. Campuses
  for (const campus of INITIAL_CAMPUSES) {
    await setDoc(doc(db, 'organizations', campus.organizationId, 'campuses', campus.id), campus, { merge: true });
    console.log(`✓ Campus criado: ${campus.name} (${campus.id})`);
  }

  // 3. Users
  for (const user of INITIAL_USERS) {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
    console.log(`✓ Usuário criado: ${user.name} (${user.id})`);
  }

  console.log('🎉 Semeação no Firestore concluída com sucesso!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao semear Firestore:', err);
  process.exit(1);
});
