---
name: documentation-synchronizer
description: Keep Markdown documentation and guides in sync with code changes
user_invocable: true
---

# Documentation Synchronizer Skill

When invoked, verify that project documentation reflects the current state of the code.

## Steps

1. **Scan for Docs**: Identify relevant Markdown files in the project root and docs folders (e.g., `FACILITY_MANAGEMENT_COMPLETE_OVERVIEW.md`, `FACILITY_REACT_COMPONENTS_SUMMARY.md`).

2. **Detect Divergence**: 
   - Compare modified components with their descriptions in `SUMMARY.md` files.
   - Check if new environment variables have been added to `.env.example` or deployment guides.
   - Verify if new API endpoints are documented in `routes/api.php` or dedicated API guides.

3. **Propose Updates**: 
   - Generate updated Markdown sections for the user to review.
   - If a new feature is added, suggest creating a new `SUMMARY.md` for it.

## Guidelines
- This project relies heavily on `SUMMARY.md` files for shared understanding. Never let them become outdated.
- Documentation should be visual-friendly (using tables, check-lists, and clear headings).
- Use the `render_diffs` function to show what parts of the docs need changing.
