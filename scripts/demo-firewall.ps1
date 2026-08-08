param(
    [int]$Port = 3000,
    [ValidateSet("Private", "Public", "Any")]
    [string]$Profile = "Private",
    [switch]$Force
)

$ruleName = "ParkTakip Demo $Port"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
    Write-Host "ERROR: Administrator privileges required. Run this script from an elevated PowerShell." -ForegroundColor Red
    exit 1
}

$existing = netsh advfirewall firewall show rule name="$ruleName" 2>&1 | Out-String
$ruleExists = $existing -match "Ok."

if ($ruleExists -and -not $Force) {
    Write-Host "Rule '$ruleName' already exists. Use -Force to recreate it."
    exit 0
}

if ($ruleExists) {
    netsh advfirewall firewall delete rule name="$ruleName" | Out-Null
    Write-Host "Removed existing rule '$ruleName'."
}

$result = netsh advfirewall firewall add rule name="$ruleName" dir=in action=allow protocol=TCP localport=$Port profile=$Profile 2>&1 | Out-String
if ($result -match "Ok.") {
    Write-Host "Rule '$ruleName' is active (TCP $Port inbound, profile $Profile)."
} else {
    Write-Host "ERROR: Failed to add rule '$ruleName'." -ForegroundColor Red
    Write-Host $result
    exit 1
}
