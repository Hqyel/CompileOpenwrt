#!/usr/bin/env bash

set -euo pipefail

source_dir="${1:-openwrt}"
custom_dir="$source_dir/package/custom"
uu_commit="1065ef4ee242dc1b8abfc724b1bb3b7997ac5a1f"

mkdir -p "$custom_dir"
rm -rf "$custom_dir/uugamebooster"

git clone --filter=blob:none --no-checkout \
  https://github.com/fengqi/luci-app-uugamebooster.git \
  "$custom_dir/uugamebooster"
git -C "$custom_dir/uugamebooster" checkout "$uu_commit"

echo "Pinned UU Game Booster package: $uu_commit"


