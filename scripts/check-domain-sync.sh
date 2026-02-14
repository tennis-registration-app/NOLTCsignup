#!/bin/bash
# Check that root domain/shared files are in sync with public/ copies
# These must stay identical until Phase 5 consolidates them
# Run: npm run check:sync or ./scripts/check-domain-sync.sh

set -e

FAIL=0

echo "Checking domain/ and shared/ sync with public/..."

# Check domain files
for f in domain/*.js; do
  public_f="public/$f"
  if [ -f "$public_f" ]; then
    if ! diff -q "$f" "$public_f" > /dev/null 2>&1; then
      echo "❌ MISMATCH: $f differs from $public_f"
      FAIL=1
    fi
  else
    echo "⚠️  WARNING: $public_f not found (expected copy of $f)"
  fi
done

# Check shared files
for f in shared/*.js; do
  public_f="public/$f"
  if [ -f "$public_f" ]; then
    if ! diff -q "$f" "$public_f" > /dev/null 2>&1; then
      echo "❌ MISMATCH: $f differs from $public_f"
      FAIL=1
    fi
  else
    echo "⚠️  WARNING: $public_f not found (expected copy of $f)"
  fi
done

# Check shared/domain files
for f in shared/domain/*.js; do
  public_f="public/$f"
  if [ -f "$public_f" ]; then
    if ! diff -q "$f" "$public_f" > /dev/null 2>&1; then
      echo "❌ MISMATCH: $f differs from $public_f"
      FAIL=1
    fi
  else
    echo "⚠️  WARNING: $public_f not found (expected copy of $f)"
  fi
done

# Check shared-utils.js
if [ -f "shared-utils.js" ] && [ -f "public/shared-utils.js" ]; then
  if ! diff -q "shared-utils.js" "public/shared-utils.js" > /dev/null 2>&1; then
    echo "❌ MISMATCH: shared-utils.js differs from public/shared-utils.js"
    FAIL=1
  fi
fi

if [ $FAIL -eq 0 ]; then
  echo "✅ All domain/shared files are in sync with public/"
  exit 0
else
  echo ""
  echo "To fix: copy the canonical (root) version to public/"
  echo "  cp domain/*.js public/domain/"
  echo "  cp shared/*.js public/shared/"
  echo "  cp shared/domain/*.js public/shared/domain/"
  echo "  cp shared-utils.js public/shared-utils.js"
  exit 1
fi
