#!/bin/bash

set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
    echo "GITHUB_OUTPUT is required" >&2
    exit 1
fi

event_name="${EVENT_NAME:-}"
input_sdk="${INPUT_SDK:-}"
input_version="${INPUT_VERSION:-}"
input_limit="${INPUT_LIMIT:-}"
input_force="${INPUT_FORCE:-}"
payload_sdk="${PAYLOAD_SDK:-}"
payload_version="${PAYLOAD_VERSION:-}"
payload_limit="${PAYLOAD_LIMIT:-}"

case "$event_name" in
    "workflow_dispatch")
        trigger="workflow_dispatch"
        sdk="${input_sdk:-all}"
        version="${input_version:-latest}"
        limit="${input_limit:-5}"
        force="${input_force:-false}"
        ;;
    "repository_dispatch")
        trigger="repository_dispatch (sdk-release)"
        sdk="${payload_sdk:-all}"
        version="${payload_version:-latest}"
        limit="${payload_limit:-5}"
        force="false"
        ;;
    "schedule")
        trigger="schedule (*/15 * * * *)"
        sdk="all"
        version="all"
        limit="3"
        force="false"
        ;;
    *)
        trigger="${event_name:-unknown}"
        sdk="all"
        version="latest"
        limit="5"
        force="false"
        ;;
esac

if [[ -z "$limit" || "$limit" == "0" ]]; then
    limit_display="No limit"
else
    limit_display="$limit"
fi

{
    echo "trigger=$trigger"
    echo "sdk=$sdk"
    echo "version=$version"
    echo "limit=$limit"
    echo "limit_display=$limit_display"
    echo "force=$force"
} >> "$GITHUB_OUTPUT"
