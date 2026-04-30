$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  ".editorconfig",
  ".env.example",
  "apps/web",
  "apps/api",
  "packages/domain",
  "packages/contracts",
  "packages/db",
  "packages/erd-ui",
  "packages/config-eslint",
  "packages/config-typescript"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path -Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing workspace paths: " + ($missing -join ", "))
}

$package = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
if ($package.packageManager -ne "pnpm@10.32.1") {
  Write-Error "packageManager must be pnpm@10.32.1"
}

Write-Host "Workspace structure is valid."
