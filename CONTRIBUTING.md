# Contributing

## Workflow
- Fork and create feature branches.
- Use Conventional Commits (e.g., `feat:`, `fix:`, `chore:`).
- Add tests where appropriate (unit or smoke).
- PRs require passing CI and integrity verification.

## Branches
- `main`: production-ready
- `staging`: pre-prod validation (optional)

## PR Checklist
- [ ] Linted / formatted
- [ ] Ran local server
- [ ] Accessibility check (keyboard + axe)
- [ ] Updated docs if needed
- [ ] Integrity verified (`./verify-release.sh`)
