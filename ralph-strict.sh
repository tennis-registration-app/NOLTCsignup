#!/bin/bash
MAX=30
for i in $(seq 1 $MAX); do
  echo ""
  echo "========================================="
  echo "  Ralph iteration $i of $MAX"
  echo "========================================="
  echo ""
  claude -p "Read RALPH_TS_STRICT.md and execute the next iteration" --model claude-sonnet-4-6 2>&1 | tee /tmp/ralph-strict-output.txt
  if grep -q "TS_STRICT_COMPLETE" /tmp/ralph-strict-output.txt; then
    echo ""
    echo "=== STRICT MODE COMPLETE ==="
    break
  fi
  echo "Iteration $i done. Continuing..."
  sleep 5
done
