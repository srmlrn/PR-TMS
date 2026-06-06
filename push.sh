#!/bin/bash
# Push PR-TMS to GitHub using a Personal Access Token.
# Usage:
#   export GITHUB_TOKEN=ghp_your_token_here
#   ./push.sh

set -e
cd "$(dirname "$0")"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: Set GITHUB_TOKEN first."
  echo "  export GITHUB_TOKEN=ghp_your_token_here"
  exit 1
fi

git push "https://srmlrn:${GITHUB_TOKEN}@github.com/srmlrn/PR-TMS.git" main
git branch --set-upstream-to=origin/main main 2>/dev/null || true
echo "Pushed to https://github.com/srmlrn/PR-TMS"
