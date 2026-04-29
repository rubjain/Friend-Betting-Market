param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

function Run-Git {
  param([string[]]$GitArgs)
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$branch = (& git branch --show-current).Trim()
if (-not $branch) {
  throw "No current Git branch found."
}

$remote = (& git remote).Trim().Split("`n") | Where-Object { $_ -eq "origin" } | Select-Object -First 1
if (-not $remote) {
  throw "No origin remote is configured."
}

Write-Host "Syncing $branch with GitHub origin..."

Run-Git @("add", "-A")
$status = (& git status --porcelain)

if ($status) {
  if (-not $Message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Message = "Auto sync $timestamp"
  }

  Run-Git @("commit", "-m", $Message)
} else {
  Write-Host "No local file changes to commit."
}

Run-Git @("pull", "--rebase", "--autostash", "origin", $branch)
Run-Git @("push", "origin", $branch)

Write-Host "GitHub sync complete."
