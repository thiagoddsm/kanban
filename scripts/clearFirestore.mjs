const PROJECT_ID = 'studio-5589719834-7481b';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function deleteDocument(docPath) {
  const url = `${BASE_URL}/${docPath}`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      console.log(`✓ Deletado com sucesso: ${docPath}`);
    } else {
      console.log(`- Documento não encontrado ou já deletado: ${docPath} (${res.status})`);
    }
  } catch (err) {
    console.error(`Erro ao deletar ${docPath}:`, err);
  }
}

async function listDocuments(collectionPath) {
  const url = `${BASE_URL}/${collectionPath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map((d) => {
      // name format: projects/studio-5589719834-7481b/databases/(default)/documents/...
      const parts = d.name.split('/documents/');
      return parts[1];
    });
  } catch {
    return [];
  }
}

async function clearAll() {
  console.log('🧹 Limpando todos os seeds e documentos do Cloud Firestore...');

  // Known collections
  const collections = ['organizations', 'users'];

  for (const col of collections) {
    const docs = await listDocuments(col);
    for (const docPath of docs) {
      // check subcollections for organizations (campuses, tasks, events, etc.)
      const campuses = await listDocuments(`${docPath}/campuses`);
      for (const c of campuses) await deleteDocument(c);

      const tasks = await listDocuments(`${docPath}/tasks`);
      for (const t of tasks) await deleteDocument(t);

      const events = await listDocuments(`${docPath}/events`);
      for (const ev of events) await deleteDocument(ev);

      const activities = await listDocuments(`${docPath}/activities`);
      for (const a of activities) await deleteDocument(a);

      const memberships = await listDocuments(`${docPath}/memberships`);
      for (const m of memberships) await deleteDocument(m);

      const comments = await listDocuments(`${docPath}/comments`);
      for (const cm of comments) await deleteDocument(cm);

      await deleteDocument(docPath);
    }
  }

  // Also specifically clean known test docs
  await deleteDocument('organizations/org_ibm/campuses/camp_ibm_sede');
  await deleteDocument('organizations/org_comunidade/campuses/camp_com_sede');
  await deleteDocument('organizations/org_ibm');
  await deleteDocument('organizations/org_comunidade');
  await deleteDocument('users/usr_admin');
  await deleteDocument('users/usr_leader');
  await deleteDocument('users/usr_team_lucas');

  console.log('✨ Cloud Firestore limpo e zerado com sucesso!');
}

clearAll();
