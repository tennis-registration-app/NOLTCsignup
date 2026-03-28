#!/bin/bash
MAX=40
for i in $(seq 1 $MAX); do
  echo ""
  echo "========================================="
  echo "  Ralph iteration $i of $MAX"
  echo "========================================="
  echo ""
  claude -p "Read RALPH_TS_MIGRATION.md and execute the next iteration" --model claude-sonnet-4-6 2>&1 | tee /tmp/ralph-output.txt
  if grep -q "TS_MIGRATION_COMPLETE" /tmp/ralph-output.txt; then
    echo ""
    echo "=== MIGRATION COMPLETE ==="
    break
  fi
  echo "Iteration $i done. Continuing..."
  sleep 5
done
