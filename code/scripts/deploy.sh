#!/usr/bin/env bash

source "$(dirname "$0")"/shared.sh

source "$(dirname "$0")"/vars.sh

echo "Creating Snap-in package..."

# For snap-in logs to be visible on DataDog, please ensure that SNAP_IN_SLUG
# starts with `airdrop-` and the total length is less than 32 characters.
# shellcheck disable=SC2086 # $DR_OPTS is intentionally split here
PKG_OUTPUT=$(devrev snap_in_package create-one $DR_OPTS --slug "$SNAP_IN_SLUG")
jq <<<"$PKG_OUTPUT"

# Check if DevRev CLI returned an error (error messages contain the field 'message')
if ! jq '.message' <<<"$PKG_OUTPUT" | grep null >/dev/null; then
  exit 1
fi

echo "Creating Snap-in version..."

PKG_NAME="$(echo "$PKG_OUTPUT" | jq -r --arg slug "$SNAP_IN_SLUG" 'select(.snap_in_package.slug == $slug) | .snap_in_package.id')"

# shellcheck disable=SC2086 # $DR_OPTS is intentionally split here
VER_OUTPUT=$(devrev snap_in_version create-one $DR_OPTS \
  --manifest "$PROJECT_ROOT"/manifest.yaml \
  --archive "$PROJECT_ROOT"/build.tar.gz \
  --package "$PKG_NAME" | tee /dev/tty)

FILTERED_OUTPUT=$(grep "snap_in_version" <<< "$VER_OUTPUT" | grep -o '{.*}')


# Check if DevRev CLI returned an error (error messages contain the field 'message')
if ! jq '.message' <<<"$FILTERED_OUTPUT" | grep null >/dev/null; then
  exit 1
fi

VERSION_ID=$(jq -r '.snap_in_version.id' <<<"$FILTERED_OUTPUT")

echo "Waiting 15 seconds for Snap-in version to be ready..."
sleep 15

while :; do
  # shellcheck disable=SC2086 # $DR_OPTS is intentionally split here
  VER_OUTPUT2=$(devrev snap_in_version show $DR_OPTS "$VERSION_ID")
  STATE=$(jq -r '.snap_in_version.state' <<<"$VER_OUTPUT2")
  if [[ "$STATE" == "build_failed" ]] || [[ "$STATE" == "deployment_failed" ]]; then
    echo "Snap-in version build/deployment failed: $(jq -r '.snap_in_version.failure_reason' <<<"$VER_OUTPUT2")"
    exit 1
  elif [[ "$STATE" == "ready" ]]; then

    break
  else
    echo "Snap-in version's state is $STATE, waiting 10 seconds..."
    sleep 10
  fi
done

echo "Creating Snap-in draft..."

# shellcheck disable=SC2086 # $DR_OPTS is intentionally split here
DRAFT_OUTPUT=$(devrev snap_in draft $DR_OPTS --snap_in_version "$VERSION_ID")
jq <<<"$DRAFT_OUTPUT"

# Check if DevRev CLI returned an error (error messages contain the field 'message')
if ! jq '.message' <<<"$DRAFT_OUTPUT" | grep null >/dev/null; then
  exit 1
fi

echo "Snap-in draft created. Please go to the Snap-ins page in the DevRev UI to complete the installation process."
