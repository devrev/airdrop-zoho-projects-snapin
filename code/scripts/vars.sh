#!/usr/bin/env bash

# The following is the default implementation of SNAP_IN_SLUG. It generates a
# unique slug based on the current epoch time. This is useful for creating
# unique Snap-in slugs for each deployment.


# Get the current epoch time
CURRENT_EPOCH=$(date +%s)

# Define the epoch time for January 1, 2024
JAN_1_2024_EPOCH=$(date -d "2024-01-01 00:00:00" +%s)

EPOCH_DIFF=$((CURRENT_EPOCH - JAN_1_2024_EPOCH))
COMPLETE_SNAP_IN_SLUG="airdrop-zoho-projects-snapin-${EPOCH_DIFF}"
MAX_LENGTH=32
LENGTH=${#COMPLETE_SNAP_IN_SLUG}

if [ $LENGTH -gt $MAX_LENGTH ]; then
    KEEP_LENGTH=$((MAX_LENGTH - 1))
    SNAP_IN_SLUG=$(echo "$COMPLETE_SNAP_IN_SLUG" | tail -c $MAX_LENGTH)
else
    SNAP_IN_SLUG=$COMPLETE_SNAP_IN_SLUG
fi

# SNAP_IN_SLUG can always be overriden by the developer. For snap-in logs to be visible on DataDog, 
# ensure that SNAP_IN_SLUG starts with `airdrop-` and the total length is less than 32 characters.
export SNAP_IN_SLUG
