#!/bin/bash

# Migration script to replace original repo with refactored code
# Run this script from your original NOLTCsignup repo directory

set -euo pipefail

echo "== Verify we're in the ORIGINAL repo =="
git remote -v
git status

echo "== Update and branch off main =="
git fetch origin
git switch -c refactor-rollout origin/main

echo "== Add and fetch the refactor repo =="
if git remote get-url refactor >/dev/null 2>&1; then
  echo "Remote 'refactor' already exists."
else
  git remote add refactor https://github.com/tennis-registration-app/courtboard-refactor-sandbox.git
fi
git fetch refactor

echo "== Create a rollback tag for the current state =="
LEGACY_TAG="legacy-pre-refactor-$(date +%Y%m%d-%H%M)"
git tag "$LEGACY_TAG"
echo "Created rollback tag: $LEGACY_TAG"

echo "== Merge histories without changing files yet (strategy ours) =="
git merge -s ours --no-commit refactor/main

echo "== Replace root files with the refactor repo's files =="
# Since both repos have files at root level, we replace the entire tree
git read-tree --prefix= -u refactor/main

echo "== Commit the replacement =="
git commit -m "Replace codebase with refactored implementation

- Enhanced wet court display with prominent icon and full text
- Fixed tennis ball purchase feature member number display
- Improved UI/UX across tennis management system
- Preserved all existing URLs and functionality

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "== Push rollout branch and rollback tag =="
git push -u origin refactor-rollout
git push origin "$LEGACY_TAG"

echo "== Done! =="
echo ""
echo "✅ Migration complete!"
echo "🏷️  Rollback tag created: $LEGACY_TAG"
echo "🌿 Branch created: refactor-rollout"
echo ""
echo "Next steps:"
echo "1. Go to GitHub and create a Pull Request: refactor-rollout -> main"
echo "2. Review the changes in the PR"
echo "3. Test the preview deployment if available"
echo "4. Merge when ready"
echo ""
echo "Your production URLs will remain the same:"
echo "https://tennis-registration-app.github.io/NOLTCsignup/Registration.html"
echo "https://tennis-registration-app.github.io/NOLTCsignup/CourtBoard.html"
echo "https://tennis-registration-app.github.io/NOLTCsignup/Admin.html"

git --no-pager log --oneline --graph --decorate -n 10