#!/usr/bin/env bash

set -euo pipefail

source_dir="${1:-openwrt}"
manifest="$(find "$source_dir/bin/targets/x86/64" \
  -maxdepth 1 -name '*.manifest' -print -quit)"

if [[ -z "$manifest" ]]; then
  echo "Firmware manifest was not generated." >&2
  exit 1
fi

required_packages=(
  ddns-go
  docker
  dockerd
  luci-app-ddns-go
  luci-app-dockerman
  luci-app-passwall
  luci-app-uugamebooster
  luci-app-vlmcsd
  luci-proto-wireguard
  luci-theme-argon
  luci-theme-homeui
  qemu-ga
  uugamebooster
  wireguard-tools
)

for package in "${required_packages[@]}"; do
  if ! grep -Eq "^${package}([[:space:]]|$)" "$manifest"; then
    echo "Required package missing from firmware: $package" >&2
    exit 1
  fi
done

echo "All required packages are present in $manifest"

