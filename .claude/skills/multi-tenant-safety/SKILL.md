---
name: multi-tenant-safety
description: Ensure data isolation between tenants by verifying Eloquent queries, models, and migrations
user_invocable: true
---

# Multi-Tenant Safety Skill

When invoked, audit the codebase to ensure tenant data isolation is maintained.

## Steps

1. **Model Audit**: Check that all new or modified models (except `User` and `Facility`) use the `App\Models\Scopes\FacilityScope`.
   - Look for `static::addGlobalScope(new FacilityScope);` in the `booted()` method.
   - Verify if the model has a `facility_id` or `branch_id` column.

2. **Query Audit**: Scan controllers and services for `withoutGlobalScope` or raw DB queries.
   - Ensure raw queries (`DB::table(...)`) include a `where('facility_id', ...)` clause.
   - Flag any `Facility::all()` or similar calls that might expose other tenants' data.

3. **Migration Audit**: Check new migrations for tenant columns.
   - Every resident-related or staff-related table should have a `facility_id` or be linked to a branch.
   - Ensure foreign key constraints are present.

4. **Middleware Check**: Verify that routes are protected by the `SetFacilityContext` middleware where applicable.

## Guidelines
- **Multi-tenancy is critical**. A leak of resident data between care homes is a major compliance failure.
- If a model is "Global" (like `AppointmentType`), confirm if it should be tenant-specific instead.
- Check that `Auth::user()->facility_id` is always used as the source of truth, rather than user-provided IDs in request bodies.
