#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cargo build --manifest-path "$repo_root/runtime/Cargo.toml" --target wasm32-unknown-unknown --release --locked
wasm-bindgen "$repo_root/runtime/target/wasm32-unknown-unknown/release/wasm_dungeonload.wasm" --target web --out-dir "$repo_root/web/wasm"
