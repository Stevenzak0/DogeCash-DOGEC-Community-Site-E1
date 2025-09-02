#!/usr/bin/env bash
# verify-release.sh — DogeCash Enterprise Build Integrity Verifier
# Usage:
#   ./verify-release.sh [PATH_TO_ZIP]
# If a ZIP path is provided, verifies its SHA-256 against deployment-checksums.txt.
# Then extracts (if needed) and verifies individual file checksums.

set -euo pipefail

RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[1;33m"; NC="\033[0m"

CHECKSUM_FILE="deployment-checksums.txt"
ZIP_PATH="${1:-}"

say() { printf "%b\n" "$1"; }

# Ensure checksum file exists
if [[ ! -f "$CHECKSUM_FILE" ]]; then
  say "${RED}ERROR:${NC} Missing ${CHECKSUM_FILE}. Place it alongside the ZIP or extracted files."
  exit 1
fi

# If a zip path was provided, verify its checksum first
if [[ -n "$ZIP_PATH" ]]; then
  if [[ ! -f "$ZIP_PATH" ]]; then
    say "${RED}ERROR:${NC} ZIP not found: ${ZIP_PATH}"
    exit 1
  fi
  say "${YELLOW}Verifying ZIP integrity...${NC}"
  sha256sum -c <(grep " ${ZIP_PATH##*/}$" "$CHECKSUM_FILE") || {
    say "${RED}FAIL:${NC} ZIP checksum mismatch for ${ZIP_PATH}"
    exit 1
  }
  say "${GREEN}ZIP OK:${NC} ${ZIP_PATH}"
fi

# If we see typical app files, assume already extracted, else try to unzip ZIP_PATH
need_extract=0
for f in index.html main.js utils.js; do
  [[ -f "$f" ]] || need_extract=1
done

if [[ $need_extract -eq 1 ]]; then
  if [[ -z "$ZIP_PATH" ]]; then
    say "${RED}ERROR:${NC} App files not found and no ZIP provided. Provide a ZIP path."
    exit 1
  fi
  say "${YELLOW}Extracting ZIP...${NC}"
  unzip -o "$ZIP_PATH" >/dev/null
fi

say "${YELLOW}Verifying individual file checksums...${NC}"
# Filter out the line for the ZIP itself when checking files
grep -v " dogecash-enterprise-final-build" "$CHECKSUM_FILE" | sha256sum -c - || {
  say "${RED}FAIL:${NC} One or more file checksums did not match."
  exit 1
}

say "${GREEN}SUCCESS:${NC} All checksums verified. Build integrity confirmed."
