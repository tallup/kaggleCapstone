---
name: api-optimizer
description: Audit React components and Laravel logic for performance bottlenecks and API efficiency
user_invocable: true
---

# API Optimizer Skill

When invoked, analyze the data flow between frontend and backend to identify performance issues.

## Steps

1. **React Query Audit**:
   - **Debouncing**: Ensure `search` terms in `queryKey` are debounced before being used so API calls don't fire on every keystroke.
   - **Stale Time**: Check if `staleTime` and `gcTime` are appropriately set. Avoid `staleTime: 0` for data that doesn't change every second (like roles or facility settings).
   - **Prefetching**: Identify opportunities to prefetch data for expected user actions.

2. **Backend (Laravel) Audit**:
   - **N+1 Identification**: Check Observers and Controllers for loops that fetch relationships (e.g., `$item->relation->name` inside a `foreach`).
   - **Eager Loading**: Suggest `with([...])` or `$model->load([...])` for required relationships.
   - **Selective Columns**: Ensure queries only fetch necessary columns, especially on large tables like `MedicationAdministration`.

3. **Inertia Handling**:
   - If using Inertia, check for "Lazy Props" to avoid sending heavy data on every request.

## Guidelines
- Focus on high-frequency routes (Dashboard, Resident List, Medication Admin).
- Prioritize "Low Hanging Fruit" like missing indexes or simple eager loading.
- Ensure `App\Utils\Logger` is used to track slow responses in development.
