# DogeCash Community Enterprise Web App

**Status:** Production Ready • **License:** MIT

Modern, secure, accessible, static web app that displays DogeCash prices and market data (CoinGecko).
- WCAG 2.1 AAA a11y
- Strict CSP + security headers
- Error boundary w/ rate-limit
- Monitoring hooks (RUM/API/errors)
- GitHub Pages deploy ready

## Live Overview
- Data source: CoinGecko public API

## Quick Start
```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Repository Structure
```txt
index.html
main.js            # app bootstrap
markets.js         # markets polling + table
converter.js       # conversion widget
utils.js           # shared helpers (cache, crypto, DOM)
constants.js       # API_CONFIG, POLLING_INTERVALS
ErrorBoundary.js   # global error handling
domSecurity.js     # safe HTML utilities
priceOracle.js     # optional Node backend (not required for frontend)
DevTeamReadMe.md   # ops + deployment playbook
deployment-checksums.txt
verify-release.sh
.github/workflows/verify.yml
.github/workflows/pages-deploy.yml
.github/workflows/codeql.yml
.github/ISSUE_TEMPLATE/bug_report.md
.github/ISSUE_TEMPLATE/feature_request.md
.github/PULL_REQUEST_TEMPLATE.md
CODE_OF_CONDUCT.md
CONTRIBUTING.md
SECURITY.md
LICENSE
```

## Deploy to GitHub Pages
1. Create a new repo on GitHub.
2. Push this project (see below).
3. The workflow **Pages Deploy** will build and publish automatically to `gh-pages` / Pages environment.

## Push to GitHub
```bash
git init
git add .
git commit -m "chore: initial import (production-ready)"
git branch -M main
git remote add origin https://github.com/<YOUR_ORG>/<YOUR_REPO>.git
git push -u origin main
```

## Integrity Verification
```bash
./verify-release.sh
# or verify zip/file hashes with deployment-checksums.txt
```

## Security
See **SECURITY.md** for reporting. CSP + headers included in `deploy/nginx.conf` (if you host elsewhere).

## License
MIT © 2025 Stevenzak0
