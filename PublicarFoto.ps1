param(
    [string]$raiz = "C:\Users\antonio.fmiranda\Desktop\Modelo Renascer 1 - Copia"
)

$origem = Join-Path $raiz "fotos-novas"
New-Item -ItemType Directory -Force -Path $origem | Out-Null

$Global:FotoProcessada = @{}

function Global:PublicarFoto([string]$caminho) {
    if (-not (Test-Path -LiteralPath $caminho)) { return }
    $ext = [System.IO.Path]::GetExtension($caminho).ToLower()
    if ($ext -notin @(".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif")) { return }
    $item = Get-Item -LiteralPath $caminho -ErrorAction SilentlyContinue
    if (-not $item) { return }
    $chave = "$caminho|$($item.Length)|$([DateTime]::Now.ToString('yyyyMMddHHmm'))"
    if ($Global:FotoProcessada[$chave]) { return }
    $Global:FotoProcessada[$chave] = $true

    Start-Sleep -Milliseconds 700
    $pastaScript = $PSScriptRoot
    if (-not $pastaScript) { $pastaScript = $raiz }
    $saida = & py (Join-Path $pastaScript "publicar_foto.py") $raiz $caminho 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao converter $caminho :" -ForegroundColor Red
        Write-Host ($saida -join "`n") -ForegroundColor Red
        return
    }
    $nome = ($saida | Select-Object -Last 1).ToString().Trim()
    Remove-Item -LiteralPath $caminho -Force -ErrorAction SilentlyContinue

    Push-Location $raiz
    for ($t = 1; $t -le 3; $t++) {
        git add img js/fotos-seed.js fotos-novas 2>&1 | Out-Null
        git commit -m "Foto publicada: $nome" 2>&1 | Out-Null
        git push origin main 2>&1 | Out-Null
        $pendente = git status --porcelain -- img js/fotos-seed.js fotos-novas 2>$null
        $ahead = git rev-list --count origin/main..main 2>$null
        if ((-not $pendente) -and ($ahead -eq "0" -or -not $ahead)) { break }
        Start-Sleep -Seconds 4
    }
    Pop-Location

    Write-Host "Foto publicada: $nome - GitHub atualizado" -ForegroundColor Green
    Write-Host "Abra o painel e escolha '$nome' na galeria (aba Fotos)." -ForegroundColor Green
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $origem
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$action = {
    $path = $Event.SourceEventArgs.FullPath
    PublicarFoto $path
}

Register-ObjectEvent $watcher 'Created' -Action $action | Out-Null
Register-ObjectEvent $watcher 'Changed' -Action $action | Out-Null

Write-Host "Vigilando a pasta: $origem" -ForegroundColor Green
Write-Host "Jogue uma foto la e ela sera publicada sozinha no app." -ForegroundColor Green

Get-ChildItem $origem -File -ErrorAction SilentlyContinue | ForEach-Object { PublicarFoto $_.FullName }

while ($true) { Start-Sleep -Seconds 5 }
