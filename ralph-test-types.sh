#!/bin/bash
MAX=25
for i in $(seq 1 $MAX); do
  echo ""
  echo "========================================="
  echo "  Ralph iteration $i of $MAX"
  echo "========================================="
  echo ""
  claude -p "Read RALPH_TEST_TYPES.md and execute the next iteration" --model claude-sonnet-4-6 2>&1 | tee /tmp/ralph-test-types-output.txt
  if grep -q "TEST_TYPES_COMPLETE" /tmp/ralph-test-types-output.txt; then
    echo ""
    echo "=== TEST TYPES COMPLETE ==="
    break
  fi
  echo "Iteration $i done. Continuing..."
  sleep 5
done
