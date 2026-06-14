---
name: deployment-guardian
description: Validate changes against deployment requirements and multi-tenant scaling
user_invocable: true
---

# Deployment Guardian Skill

When invoked, ensure the code is production-ready for the Laravel Forge Multi-Tenant environment.

## Steps

1. **Script Validation**: 
   - Verify if changes require updates to `deploy.sh`, `deploy-multi-tenant.sh`, or `forge.env.example`.
   - Check if new migrations require a specific order or "Fresh" vs "Standard" deployment.

2. **Asset Check**:
   - Ensure new CSS variables or Vite configurations are consistent with the `nginx-build-assets.conf`.

3. **Performance Scaling**:
   - Check Redis usage for caching/sessions.
   - Verify if database queries will scale across many facilities.

4. **Multi-Tenant Readiness**:
   - Confirm if new features handle the "Subdomain" vs "Apex Domain" logic correctly (as seen in `SetFacilityContext`).

## Guidelines
- Follow the patterns in `DEPLOYMENT_CHECKLIST_MULTI_TENANT.md`.
- Prioritize non-breaking changes. If a migration is destructive, warn heavily.
- Ensure all new public assets are correctly handled by the build process.
