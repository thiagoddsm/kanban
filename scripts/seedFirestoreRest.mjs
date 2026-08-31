const PROJECT_ID = 'studio-5589719834-7481b';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function setDoc(collectionPath, docId, data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { integerValue: value.toString() };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) => ({ stringValue: String(v) })),
        },
      };
    } else if (typeof value === 'object' && value !== null) {
      fields[key] = {
        stringValue: JSON.stringify(value),
      };
    }
  }

  const url = `${BASE_URL}/${collectionPath}/${docId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const txt = await response.text();
    console.error(`Erro ao criar ${collectionPath}/${docId}:`, response.status, txt);
  } else {
    console.log(`✓ Gravado no Firestore: ${collectionPath}/${docId}`);
  }
}

async function run() {
  console.log('🚀 Semeando coleções no Cloud Firestore via API...');

  // 1. Organizations
  await setDoc('organizations', 'org_ibm', {
    id: 'org_ibm',
    name: 'Igreja Batista Memorial (IBM)',
    slug: 'ibm',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });

  await setDoc('organizations', 'org_comunidade', {
    id: 'org_comunidade',
    name: 'Comunidade da Fé',
    slug: 'comunidade-fe',
    plan: 'PRO',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });

  // 2. Campuses
  await setDoc('organizations/org_ibm/campuses', 'camp_ibm_sede', {
    id: 'camp_ibm_sede',
    organizationId: 'org_ibm',
    name: 'Campus Sede (Central)',
    code: 'SEDE',
    city: 'São Paulo - SP',
    isMainCampus: true,
  });

  await setDoc('organizations/org_comunidade/campuses', 'camp_com_sede', {
    id: 'camp_com_sede',
    organizationId: 'org_comunidade',
    name: 'Campus Principal',
    code: 'SEDE',
    city: 'Campinas - SP',
    isMainCampus: true,
  });

  // 3. Users
  await setDoc('users', 'usr_admin', {
    id: 'usr_admin',
    name: 'Pr. Carlos Mendes',
    email: 'carlos.mendes@marketingibm.com',
    role: 'ADMIN',
  });

  console.log('🎉 Finalizado com sucesso!');
}

run();
