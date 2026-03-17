#!/bin/bash

set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
    echo "GITHUB_OUTPUT is required" >&2
    exit 1
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "GH_TOKEN is required" >&2
    exit 1
fi

base_branch="${BASE_BRANCH:?BASE_BRANCH is required}"
branch_name="${BRANCH_NAME:-automation/sdk-reference-sync}"
sdk_name="${SDK_NAME:-all}"
sdk_version="${SDK_VERSION:-latest}"
trigger="${TRIGGER:-unknown}"
limit_display="${LIMIT_DISPLAY:-5}"
force="${FORCE:-false}"
changed_files="${CHANGED_FILES:-0}"
total_mdx_files="${TOTAL_MDX_FILES:-0}"
workflow_name="${WORKFLOW_NAME:-}"
repository="${REPOSITORY:-}"
run_id="${RUN_ID:-}"

if [[ "$base_branch" == "$branch_name" ]]; then
    echo "Base branch and PR branch cannot be the same" >&2
    exit 1
fi

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

git switch -C "$branch_name"
git add docs/sdk-reference docs.json

if git diff --staged --quiet; then
    {
        echo "operation=none"
        echo "url="
    } >> "$GITHUB_OUTPUT"
    exit 0
fi

title="docs: sync SDK reference for ${sdk_name} ${sdk_version}"

git commit -m "$title"
git push --force-with-lease origin "HEAD:${branch_name}"

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

cat <<EOF > "$body_file"
## Summary
This automated PR syncs generated SDK reference documentation.

## Trigger
- Source: \`${trigger}\`
- SDK: \`${sdk_name}\`
- Version: \`${sdk_version}\`
- Limit: \`${limit_display}\`
- Force: \`${force}\`

## Changes
- Updates generated reference files under \`docs/sdk-reference/**\`
- Updates \`docs.json\` navigation when generation changes the docs tree
- Changed files detected in this run: \`${changed_files}\`
- Total tracked MDX reference files after generation: \`${total_mdx_files}\`

## Run Details
- Workflow: \`${workflow_name}\`
- Run: https://github.com/${repository}/actions/runs/${run_id}
EOF

pr_info="$(gh pr list \
    --repo "$repository" \
    --base "$base_branch" \
    --head "$branch_name" \
    --state open \
    --json number,url \
    --jq '.[0]? | select(.) | [.number, .url] | @tsv')"

if [[ -n "$pr_info" ]]; then
    pr_number="${pr_info%%$'\t'*}"
    pr_url="${pr_info#*$'\t'}"
    gh pr edit "$pr_number" --repo "$repository" --title "$title" --body-file "$body_file" >/dev/null
    operation="updated"
else
    pr_url="$(gh pr create \
        --repo "$repository" \
        --base "$base_branch" \
        --head "$branch_name" \
        --title "$title" \
        --body-file "$body_file")"
    operation="created"
fi

{
    echo "operation=$operation"
    echo "url=$pr_url"
} >> "$GITHUB_OUTPUT"
