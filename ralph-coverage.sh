#!/bin/bash
MAX=25
for i in $(seq 1 $MAX); do
  echo ""
  echo "========================================="
  echo "  Ralph iteration $i of $MAX"
  echo "========================================="
  echo ""
  claude -p "Read RALPH_TEST_COVERAGE.md and execute the next iteration" --model claude-sonnet-4-6 2>&1 | tee /tmp/ralph-coverage-output.txt
  if grep -q "COVERAGE_COMPLETE" /tmp/ralph-coverage-output.txt; then
    echo ""
    echo "=== COVERAGE COMPLETE ==="
    break
  fi
  echo "Iteration $i done. Continuing..."
  sleep 5
done
