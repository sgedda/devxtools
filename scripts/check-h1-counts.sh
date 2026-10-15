#!/bin/bash
# Check that each article page has exactly one H1

set -e

echo "Checking H1 counts in article pages..."

failed=0

for page in dist/guides/*/index.html dist/testing/*/index.html dist/comparisons/*/index.html dist/observability/*/index.html; do
  if [ -f "$page" ]; then
    h1_count=$(grep -c '<h1' "$page" || echo "0")
    page_name=$(basename $(dirname "$page"))
    
    if [ "$h1_count" -ne 1 ]; then
      echo "❌ $page_name: $h1_count H1(s) (expected 1)"
      failed=1
    else
      echo "✓ $page_name: 1 H1"
    fi
  fi
done

if [ $failed -eq 1 ]; then
  echo ""
  echo "ERROR: Some pages have incorrect H1 counts"
  exit 1
fi

echo ""
echo "✅ All article pages have exactly one H1"
