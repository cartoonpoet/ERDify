$ErrorActionPreference = "Stop"

$requiredFiles = @(
  "packages/config-typescript/package.json",
  "packages/config-typescript/base.json",
  "packages/config-typescript/react.json",
  "packages/config-typescript/nest.json",
  "packages/config-typescript/node.json",
  "packages/config-eslint/package.json",
  "packages/config-eslint/base.js",
  "packages/config-eslint/react.js",
  "packages/config-eslint/nest.js",
  "eslint.config.js"
)

$missing = @()
foreach ($file in $requiredFiles) {
  if (-not (Test-Path -Path $file)) {
    $missing += $file
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing config files: " + ($missing -join ", "))
}

Get-Content -Raw -Path "packages/config-typescript/base.json" | ConvertFrom-Json | Out-Null
Get-Content -Raw -Path "packages/config-typescript/react.json" | ConvertFrom-Json | Out-Null
Get-Content -Raw -Path "packages/config-typescript/nest.json" | ConvertFrom-Json | Out-Null
Get-Content -Raw -Path "packages/config-typescript/node.json" | ConvertFrom-Json | Out-Null

Write-Host "Config packages are valid."
