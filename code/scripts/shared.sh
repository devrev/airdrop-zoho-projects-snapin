# This file includes the common functionality used by the other scripts, it is
# not meant to be executed directly.

set -o errexit
set -o pipefail

export PROJECT_ROOT
export DR_OPTS

PROJECT_ROOT="$(cd "$(dirname "$0")"/../.. && pwd)"

# Set default values for CLI options
DR_OPTS="-q"
if [[ -n "$ENV" ]]; then
  DR_OPTS="$DR_OPTS --env $ENV"
fi
if [[ -n "$DEV_ORG" ]]; then
  DR_OPTS="$DR_OPTS --org $DEV_ORG"
fi
if [[ -n "$USER_EMAIL" ]]; then
  DR_OPTS="$DR_OPTS --usr $USER_EMAIL"
fi

# Check if token is up-to-date
# shellcheck disable=SC2086 # $DR_OPTS is intentionally split here
TOKEN="$(devrev profiles get-token access $DR_OPTS 2>&1)" || true
if [[ "$TOKEN" == *"profile is not configured"* ]]; then
  echo "Authenticating to $DEV_ORG..."

  # shellcheck disable=SC2086 # $DR_OPTS is intentionally split here
  devrev profiles authenticate $DR_OPTS --expiry 7
else
  # get current timestamp in epoch
  CURRENT_TIMESTAMP=$(date +%s)
  # get token expiry timestamp without the timezone
  TOKEN_EXPIRY=$(devrev profiles get-token expiry $DR_OPTS | sed 's/[[:space:]]\+[A-Z][A-Z]*$//')
  echo "Token expiry" $TOKEN_EXPIRY

  #  Try to convert the timestamp to epoch
  if TOKEN_EXPIRY_EPOCH=$(date -d "$TOKEN_EXPIRY" +%s 2>/dev/null); then
    echo "Token expiry" $TOKEN_EXPIRY_EPOCH
    if [[ "$TOKEN_EXPIRY_EPOCH" -lt "$CURRENT_TIMESTAMP" ]]; then
      echo "Refreshing token..."
      # shellcheck disable=SC2086 # $DR_OPTS is intentionally split here
      devrev profiles authenticate $DR_OPTS --expiry 7
    fi
  else
    # Authenticate in case of errors to increase the chances of success
    echo "Unable to remove timestamp from the expiry token. Refreshing token..."
    # shellcheck disable=SC2086 # $DR_OPTS is intentionally split here
    devrev profiles authenticate $DR_OPTS --expiry 7
  fi
fi
