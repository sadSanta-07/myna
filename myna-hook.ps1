Import-Module PSReadLine

# Bind to BOTH the physical Enter key and the network Carriage Return (Ctrl+m)
Set-PSReadLineKeyHandler -Chord 'Enter', 'Ctrl+m' -ScriptBlock {
    $line = $null
    $cursor = $null
    
    [Microsoft.PowerShell.PSConsoleReadLine]::GetBufferState([ref]$line, [ref]$cursor)
    $cmd = $line.Trim()

    Write-Host "`n[debug] Hook intercepted: '$cmd'" -ForegroundColor DarkGray

    if ([string]::IsNullOrWhiteSpace($cmd)) {
        [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
        return
    }

    if (-not $env:MYNA_GATE_PIPE) {
        [Console]::WriteLine()
        Write-Host "⚠️  [myna] Guardrail pipe not configured. Failing closed." -ForegroundColor Red
        [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
        return
    }
    try {
        $pipeName = $env:MYNA_GATE_PIPE.Replace("\\.\pipe\", "")
        $pipeClient = New-Object System.IO.Pipes.NamedPipeClientStream(".", $pipeName, [System.IO.Pipes.PipeDirection]::InOut)
        
        $pipeClient.Connect(2000)

        $writer = New-Object System.IO.StreamWriter($pipeClient)
        $reader = New-Object System.IO.StreamReader($pipeClient)
        
        $escapedCmd = $cmd.Replace("\", "\\").Replace('"', '\"')
        $body = '{"cmd":"' + $escapedCmd + '"}'
        
        $writer.Write($body)
        $writer.Flush()

        $response = $reader.ReadToEnd()
        $pipeClient.Dispose()
        
        if ($response -match '"allowed":true') {
            [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
        } else {
            [Console]::WriteLine()
            Write-Host "⚠️  [myna] Host blocked this command." -ForegroundColor Red
            [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
        }
    } catch {
        [Console]::WriteLine()
        Write-Host "⚠️  [myna] FATAL: Guardrail IPC unreachable. Failing closed to protect host." -ForegroundColor Red
        [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
    }
}

Write-Host "[myna] Guardrail hook connected to Secure IPC Socket (Fail-Closed Enabled)." -ForegroundColor Cyan