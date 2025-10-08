#!/usr/bin/env bash
set -euo pipefail

# Parse flags
REDEPLOY_ONLY=false
if [[ "${1:-}" == "--redeploy" ]]; then
  REDEPLOY_ONLY=true
  echo "[devnet] Redeploy mode enabled"
fi

# Paths
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
ANVIL_LOG="$CONTRACTS_DIR/.anvil.log"
DEPLOY_LOG="$CONTRACTS_DIR/.deploy.log"
ENV_FILE="$CONTRACTS_DIR/.env"
ROOT_ENV_FILE="$ROOT_DIR/.env"

echo "[devnet] Root: $ROOT_DIR"
echo "[devnet] Contracts: $CONTRACTS_DIR"

# Requirements
for cmd in anvil forge jq lsof; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[devnet] ERROR: '$cmd' is required but not found in PATH" >&2
    exit 1
  fi
done

# Check deploy key availability (Makefile requires TESTNET_PRIVATE_KEY)
if [[ -z "${TESTNET_PRIVATE_KEY:-}" ]]; then
  if [[ -f "$ENV_FILE" ]] && grep -q '^TESTNET_PRIVATE_KEY=' "$ENV_FILE"; then
    echo "[devnet] Using TESTNET_PRIVATE_KEY from $ENV_FILE"
    # shellcheck disable=SC1090
    set -a; . "$ENV_FILE"; set +a
  else
    echo "[devnet] ERROR: TESTNET_PRIVATE_KEY not provided; set env var or add to $ENV_FILE" >&2
    exit 1
  fi
fi

mkdir -p "$CONTRACTS_DIR"
touch "$ANVIL_LOG" "$DEPLOY_LOG" "$ENV_FILE" "$ROOT_ENV_FILE"

MAKE_PID=""
ANVIL_PID=""
ANVIL_ALREADY_RUNNING=false

cleanup() {
  local code=$?
  echo "[devnet] Cleaning up..."
  
  # Only kill anvil if we started it (not in redeploy mode or wasn't already running)
  if [[ "$ANVIL_ALREADY_RUNNING" == "false" ]]; then
    # Kill anvil process listening on 8545 if still alive
    if [[ -n "$ANVIL_PID" ]] && ps -p "$ANVIL_PID" >/dev/null 2>&1; then
      echo "[devnet] Killing anvil (pid=$ANVIL_PID)"
      kill -TERM "$ANVIL_PID" 2>/dev/null || true
      wait "$ANVIL_PID" 2>/dev/null || true
    else
      # Fallback: kill listener on :8545 if any
      PID_ON_PORT=$(lsof -i :8545 -sTCP:LISTEN -t 2>/dev/null || true)
      if [[ -n "${PID_ON_PORT:-}" ]]; then
        echo "[devnet] Killing anvil by port (pid=$PID_ON_PORT)"
        kill -TERM "$PID_ON_PORT" 2>/dev/null || true
        wait "$PID_ON_PORT" 2>/dev/null || true
      fi
    fi

    # Kill make wrapper if still running
    if [[ -n "$MAKE_PID" ]] && ps -p "$MAKE_PID" >/dev/null 2>&1; then
      echo "[devnet] Stopping make anvil-fork (pid=$MAKE_PID)"
      kill -TERM "$MAKE_PID" 2>/dev/null || true
      wait "$MAKE_PID" 2>/dev/null || true
    fi
  else
    echo "[devnet] Leaving anvil running (was already running)"
  fi

  echo "[devnet] Done."
  exit $code
}
trap cleanup INT TERM EXIT

# Check if anvil is already running
if nc -z localhost 8545 >/dev/null 2>&1; then
  ANVIL_ALREADY_RUNNING=true
  ANVIL_PID=$(lsof -i :8545 -sTCP:LISTEN -t 2>/dev/null | head -n1 || true)
  echo "[devnet] anvil already running on :8545 (pid: ${ANVIL_PID:-unknown})"
  
  if [[ "$REDEPLOY_ONLY" == "false" ]]; then
    echo "[devnet] ERROR: anvil is already running. Use --redeploy flag to redeploy factory without restarting anvil." >&2
    exit 1
  fi
else
  if [[ "$REDEPLOY_ONLY" == "true" ]]; then
    echo "[devnet] ERROR: --redeploy flag requires anvil to be already running on :8545" >&2
    exit 1
  fi
  
  echo "[devnet] Starting anvil fork (via Makefile)..."
  set -m
  (
    cd "$CONTRACTS_DIR"
    make anvil-fork
  ) >>"$ANVIL_LOG" 2>&1 &
  MAKE_PID=$!
  echo "[devnet] anvil-fork started (make pid=$MAKE_PID), logs: $ANVIL_LOG"

  echo -n "[devnet] Waiting for anvil on :8545"
  for i in $(seq 1 120); do
    if nc -z localhost 8545 >/dev/null 2>&1; then
      echo " ✓"
      break
    fi
    echo -n "."
    sleep 0.5
  done
  if ! nc -z localhost 8545 >/dev/null 2>&1; then
    echo "\n[devnet] ERROR: anvil did not start on :8545 in time" >&2
    exit 1
  fi

  # Capture anvil PID (listener on port 8545)
  ANVIL_PID=$(lsof -i :8545 -sTCP:LISTEN -t 2>/dev/null | head -n1 || true)
  echo "[devnet] anvil pid: ${ANVIL_PID:-unknown}"
fi

echo "[devnet] Deploying LevrFactoryDevnet (via Makefile)..."
(
  cd "$CONTRACTS_DIR"
  make deploy-devnet-factory
) | tee "$DEPLOY_LOG"

# Try to parse factory address from console logs
FACTORY_ADDR=$(grep -Eo 'Factory Address:\s*0x[a-fA-F0-9]{40}' "$DEPLOY_LOG" | tail -n1 | awk '{print $3}' || true)

# Fallback to broadcast artifact if needed
if [[ -z "${FACTORY_ADDR:-}" ]]; then
  echo "[devnet] Parsing broadcast artifacts for factory address..."
  BROADCAST_DIR="$CONTRACTS_DIR/broadcast/DeployLevrFactoryDevnet.s.sol"
  if [[ -d "$BROADCAST_DIR" ]]; then
    LATEST=$(find "$BROADCAST_DIR" -name run-latest.json -type f -print0 | xargs -0 ls -t | head -n1 || true)
    if [[ -n "${LATEST:-}" ]]; then
      FACTORY_ADDR=$(jq -r '(.transactions[]? | select(.contractName=="LevrFactory_v1") | .contractAddress) // empty' "$LATEST" | tail -n1 || true)
      if [[ -z "${FACTORY_ADDR:-}" ]]; then
        FACTORY_ADDR=$(jq -r '.receipts[0]?.contractAddress // empty' "$LATEST" || true)
      fi
    fi
  fi
fi

if [[ -z "${FACTORY_ADDR:-}" ]]; then
  echo "[devnet] ERROR: Could not determine FACTORY_ADDRESS" >&2
  exit 1
fi

echo "[devnet] FACTORY_ADDRESS=$FACTORY_ADDR"

# Write/update FACTORY_ADDRESS in contracts/.env
if grep -q '^FACTORY_ADDRESS=' "$ENV_FILE"; then
  # macOS/BSD sed requires empty string after -i
  sed -i '' -E "s/^FACTORY_ADDRESS=.*/FACTORY_ADDRESS=$FACTORY_ADDR/" "$ENV_FILE"
else
  echo "FACTORY_ADDRESS=$FACTORY_ADDR" >> "$ENV_FILE"
fi

echo "[devnet] Updated $ENV_FILE with FACTORY_ADDRESS"

# Write/update NEXT_PUBLIC_LEVR_FACTORY_V1_ANVIL in project root .env for Next.js
if grep -q '^NEXT_PUBLIC_LEVR_FACTORY_V1_ANVIL=' "$ROOT_ENV_FILE"; then
  sed -i '' -E "s/^NEXT_PUBLIC_LEVR_FACTORY_V1_ANVIL=.*/NEXT_PUBLIC_LEVR_FACTORY_V1_ANVIL=$FACTORY_ADDR/" "$ROOT_ENV_FILE"
else
  echo "NEXT_PUBLIC_LEVR_FACTORY_V1_ANVIL=$FACTORY_ADDR" >> "$ROOT_ENV_FILE"
fi

echo "[devnet] Updated $ROOT_ENV_FILE with NEXT_PUBLIC_LEVR_FACTORY_V1_ANVIL"

# In redeploy mode, exit cleanly; otherwise wait for anvil
if [[ "$REDEPLOY_ONLY" == "true" ]]; then
  echo "[devnet] Factory redeployed successfully. Anvil still running on :8545"
  exit 0
else
  # Keep foreground attached to anvil; wait for make job (and cleanup via trap on exit)
  echo "[devnet] Devnet running. Press Ctrl+C to stop."
  wait "$MAKE_PID"
fi


