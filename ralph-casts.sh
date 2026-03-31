#!/bin/bash
MAX=15
for i in $(seq 1 $MAX); do
  echo ""
  echo "========================================="
  echo "  Ralph iteration $i of $MAX"
  echo "========================================="
  echo ""
  claude -p "Read RALPH_TS_CASTS.md and execute the next iteration" --model claude-sonnet-4-6 2>&1 | tee /tmp/ralph-casts-output.txt
  if grep -q "CASTS_COMPLETE" /tmp/ralph-casts-output.txt; then
    echo ""
    echo "=== CASTS COMPLETE ==="
    break
  fi
  echo "Iteration $i done. Continuing..."
  sleep 5
done
