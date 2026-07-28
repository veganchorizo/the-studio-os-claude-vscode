# Roadmap & module status

This foundation prioritizes a runnable, coherent whole over shallow coverage of
every screen. Status legend: ✅ end-to-end · �some backend + generic UI · ⛭ contract only.

| Module            | DB model | API                         | UI                          | Status |
| ----------------- | :------: | --------------------------- | --------------------------- | :----: |
| Auth / RBAC       |    ✅    | login/logout/me/users        | login screen                |   ✅   |
| Dashboard         |    ✅    | `/api/dashboard` aggregate   | command-center widgets      |   ✅   |
| Sessions          |    ✅    | full CRUD + mix revisions    | list + rich detail          |   ✅   |
| Equipment         |    ✅    | CRUD + maintenance/calib.    | list + rich detail          |   ✅   |
| AI Assistant      |    ✅    | streaming chat + agents      | chat, agents, citations     |   ✅   |
| Global search     |    ✅    | hybrid `/api/search`         | topbar search               |   ✅   |
| Knowledge base    |    ✅    | documents + versions         | live data view              |   🟠   |
| Ingestion         |    ✅    | watcher + worker pipeline    | (background)                |   ✅   |
| Clients (CRM)     |    ✅    | CRUD                         | live data view              |   🟠   |
| Artists           |    ✅    | CRUD                         | live data view              |   🟠   |
| Projects          |    ✅    | CRUD                         | live data view              |   🟠   |
| Maintenance       |    ✅    | records + predictions        | live data view              |   🟠   |
| Inventory         |    ✅    | CRUD + low-stock             | live data view              |   🟠   |
| Tasks             |    ✅    | CRUD                         | live data view              |   🟠   |
| Calendar          |    ✅    | CRUD                         | live data view              |   🟠   |
| Finance           |    ✅    | invoices/payments/expenses   | live data view              |   🟠   |
| Marketing         |    ✅    | content CRUD                 | live data view              |   🟠   |
| Patchbay          |    ✅    | presets/connections          | live data view              |   🟠   |
| Intern Training   |    ✅    | lessons/quizzes/progress     | live data view              |   🟠   |
| Settings          |    ✅    | get/put settings             | live data view              |   🟠   |
| Plugin system     |    —     | registry + contracts         | nav extension point         |   ✅   |

## Next steps to reach full parity

1. Replace the generic `Placeholder` views with bespoke UIs (Kanban for tasks,
   drag-and-drop calendar, interactive patchbay grid, finance charts).
2. Add file upload endpoints for session photos / equipment manuals that feed
   the same ingestion pipeline.
3. Wire domain events (`session.created`, `document.indexed`) through the
   plugin registry from the services.
4. Expand test coverage: integration tests against a throwaway Postgres, plus
   more Playwright journeys.
