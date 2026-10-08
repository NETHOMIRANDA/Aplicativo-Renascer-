$folder = "C:\Users\netho\OneDrive\Desktop\Modelo Renascer 1"
$filter = '*.*'

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $folder
$watcher.Filter = $filter
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

Write-Host "Monitorando alteracoes na pasta: $folder..." -ForegroundColor Green

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    
    if ($path -like "*\.git\*") { return }
    if ($path -like "*fotos-novas*") { return }

    Write-Host "Detectado: $changeType em $path" -ForegroundColor Yellow
    
    Set-Location -Path "C:\Users\netho\OneDrive\Desktop\Modelo Renascer 1"
    
    Start-Sleep -Seconds 2
    
    git add .
    git commit -m "Atualizacao automatica: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"
    git push origin main
    
    Write-Host "GitHub atualizado com sucesso!" -ForegroundColor Green
}

Register-ObjectEvent $watcher 'Changed' -Action $action
Register-ObjectEvent $watcher 'Created' -Action $action
Register-ObjectEvent $watcher 'Deleted' -Action $action
Register-ObjectEvent $watcher 'Renamed' -Action $action

while ($true) { Start-Sleep -Seconds 5 }
