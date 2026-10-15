# myna-hook.ps1
Import-Module PSReadLine

Set-PSReadLineKeyHandler -Chord 'Enter' -ScriptBlock {
    $line = $null
    $cursor = $null
    
    [Microsoft.PowerShell.PSConsoleReadLine]::GetBufferState([ref]$line, [ref]$cursor)
    $cmd = $line.Trim()

    if ([string]::IsNullOrWhiteSpace($cmd)) {
        [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
        return
    }

    try {
        $body = @{ cmd = $cmd } | ConvertTo-Json -Compress
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:41234/check" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 15
        
        if ($response.allowed -eq $true) {
            [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
        } else {
            [Console]::WriteLine()
            Write-Host "⚠️  [myna] Host blocked this command." -ForegroundColor Red
            [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
        }
    } catch {
        [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
    }
}

Write-Host "[myna] Guardrail hook connected to Local Input Gate." -ForegroundColor Cyan