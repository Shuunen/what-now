#!/usr/bin/env bash
# Single entry point for the What Now voice coach spike.
# Sets up the venv on first run, then just runs the spike every time after.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -d .venv ]; then
  echo "Creating venv and installing dependencies (first run only)..."
  python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install --upgrade pip -q
  pip install -r requirements.txt -q
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

if ! curl -s -o /dev/null http://localhost:11434/api/tags; then
  echo "Ollama isn't reachable at localhost:11434 -- start it first: ollama serve"
  exit 1
fi

if ! ollama list | grep -q "^llama3.2"; then
  echo "Pulling llama3.2 (first run only)..."
  ollama pull llama3.2
fi

echo "Starting the coach. Talk into your mic once you see 'pipeline is now ready'."
echo "It auto-stops after 3 full exchanges and prints a timing summary. Ctrl+C also works if needed."
echo "Full output also being written to: $(pwd)/run.log"
python3 -u server/spike.py 2>&1 | tee run.log
