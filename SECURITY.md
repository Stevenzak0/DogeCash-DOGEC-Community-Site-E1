# Security Policy

## Supported Versions
- Main branch; releases tagged `v*`.

## Best Practices in Repo
- Strict CSP and server headers (see DevTeamReadMe.md / nginx.conf).
- No secrets committed to repo.
- Input validation and XSS protections in `utils.js`/`domSecurity.js`.
