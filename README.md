# Oiko Marketing — Sistema de Gestão Operacional de Comunicação

O **Oiko Marketing** é um SaaS multi-tenant desenvolvido especialmente para equipes e ministérios de marketing e comunicação de igrejas e organizações.

---

## 🚀 Principais Módulos & Recursos

- **Quadro Kanban de Demandas**: Gestão completa de solicitações, triagem, bloqueios, dependências e múltiplos responsáveis com avatares sobrepostos.
- **Projetos de Eventos & Campanhas**: Gerenciamento de cultos especiais, conferências, séries e modelos automatizados com prazos encadeados.
- **Cronograma Gantt & Calendário**: Projeção visual de cronogramas e entregas por equipe.
- **Central de Notificações & Aprovações**: Validação pastoral de peças com histórico de revisões e auditoria.
- **Governança Multi-Tenant & RBAC**: Suporte a múltiplos campi, convites por token e papéis (`ADMIN`, `LEADER`, `TEAM`, `REQUESTER`).
- **Autenticação Real com Firebase**: Login com Google, E-mail/Senha, Criação de Contas e Recuperação de Senha.
- **Persistência no Cloud Firestore**: Banco de dados NoSQL em nuvem em tempo real com regras de segurança granulares.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend & Cloud**: Firebase Authentication, Google Cloud Firestore
- **Qualidade & Confiabilidade**: Suíte de testes E2E automatizada, ErrorBoundary e Exportação de Backup / LGPD

---

## 📦 Como Rodar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/thiagoddsm/kanban.git
cd kanban
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O aplicativo estará disponível em: `http://localhost:2002/` (ou porta indicada no terminal).
