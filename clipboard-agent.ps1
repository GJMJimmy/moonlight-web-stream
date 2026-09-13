# moonlight-web clipboard agent
# Runs in the host's user session and relays the clipboard between the host
# and the moonlight-web server (which cannot touch the clipboard from a
# service session).
#
# Usage:  powershell -ExecutionPolicy Bypass -File clipboard-agent.ps1 [-Port 47999]
# Tip:    add it as a Sunshine "Do" command so it starts with every stream:
#         powershell -ExecutionPolicy Bypass -File <full path>\clipboard-agent.ps1

param(
    [int]$Port = 47999
)

$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:$Port"
$lastHost = $null

Write-Host "[clipboard-agent] started, server: $base"

while ($true) {
    try {
        # Device -> host: take queued text and put it on the host clipboard
        $res = Invoke-RestMethod -Uri "$base/api/clipboard/agent/poll" -Method Get -TimeoutSec 5
        if ($res.text) {
            Set-Clipboard -Value $res.text
            Write-Host "[clipboard-agent] set host clipboard from device ($($res.text.Length) chars)"
        }

        # Host -> device: push the host clipboard when it changes
        $cb = Get-Clipboard -Raw
        if ($null -ne $cb -and $cb -cne $lastHost) {
            if ($null -ne $lastHost) {
                $body = [System.Text.Encoding]::UTF8.GetBytes($cb)
                Invoke-RestMethod -Uri "$base/api/clipboard/agent/push" -Method Post -Body $body -ContentType "text/plain; charset=utf-8" -TimeoutSec 5 | Out-Null
                Write-Host "[clipboard-agent] pushed host clipboard to server ($($cb.Length) chars)"
            }
            $lastHost = $cb
        }
    } catch {
        Write-Host "[clipboard-agent] $($_.Exception.Message)"
        Start-Sleep -Seconds 2
    }

    Start-Sleep -Milliseconds 400
}
