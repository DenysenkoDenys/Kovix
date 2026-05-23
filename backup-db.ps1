param(
    [string]$BackupPath = "C:\backups",
    [string]$ContainerName = "mssql_kovix_prod",
    [string]$Username = "sa",
    [string]$Password = "KovixStrongPass123!",
    [string]$Database = "KovixDb"
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFileName = "KovixDb_backup_$timestamp.bak"

$containerPath = "/var/opt/mssql/backups/$backupFileName"
$localFilePath = Join-Path $BackupPath $backupFileName

Write-Host "================================"
Write-Host "Starting database backup..."
Write-Host "================================"

if (-not (Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Host "Created folder: $BackupPath"
}

docker exec $ContainerName mkdir -p /var/opt/mssql/backups | Out-Null

$backupQuery = @"
BACKUP DATABASE [$Database]
TO DISK = '$containerPath'
WITH FORMAT, INIT, COMPRESSION, STATS = 10;
"@

Write-Host ""
Write-Host "Executing BACKUP..."

try {
    $result = docker exec -i $ContainerName /opt/mssql-tools18/bin/sqlcmd `
        -S localhost `
        -U $Username `
        -P $Password `
        -C `
        -Q $backupQuery 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ BACKUP ERROR:"
        Write-Host $result
        exit 1
    }

    Write-Host "Copying backup to Windows..."

    docker cp "${ContainerName}:${containerPath}" "$localFilePath"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ COPY ERROR"
        exit 1
    }
    
    Write-Host "✔ File copied successfully"
    Write-Host ""
    Write-Host "================================"
    Write-Host "✔ BACKUP SUCCESSFUL"
    Write-Host "File: $localFilePath"
    Write-Host "Time: $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')"
    Write-Host "================================"
}
catch {
    Write-Host "❌ EXCEPTION: $_"
    exit 1
}

Write-Host "Done!"