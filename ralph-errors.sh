#!/bin/bash
MAX=20
for i in $(seq 1 $MAX); do
  echo ""
  echo "========================================="
  echo "  Ralph iteration $i of $MAX"
  echo "========================================="
  echo ""
  claude -p "Read RALPH_TS_ERRORS.md and execute the next iteration" --model claude-sonnet-4-6 2>&1 | tee /tmp/ralph-errors-output.txt
  if grep -q "TS_ERRORS_COMPLETE" /tmp/ralph-errors-output.txt; then
    echo ""
    echo "=== TS ERRORS FIXED ==="
    break
  fi
  echo "Iteration $i done. Continuing..."
  sleep 5
done
