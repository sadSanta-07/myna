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

    if (-not $env:MYNA_GATE_PIPE) {
        [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
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
        [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
    }
}

Write-Host "[myna] Guardrail hook connected to Secure IPC Socket." -ForegroundColor Cyan