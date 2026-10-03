param(
    [Parameter(Mandatory=$true)][string]$Destination,
    [Parameter(Mandatory=$true)][string]$NodePath,
    [Parameter(Mandatory=$true)][string]$WranglerPath,
    [string]$PythonPath='python'
)
$ErrorActionPreference='Stop'
$repoPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$targetPath=[IO.Path]::GetFullPath($Destination)
if($targetPath.Equals($repoPath,[StringComparison]::OrdinalIgnoreCase) -or $targetPath.StartsWith($repoPath+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){
    throw 'Backups contain private data. Destination must be outside the repository.'
}
if(-not (Test-Path -LiteralPath $targetPath -PathType Container)){throw 'Create a private destination folder before running this command.'}
# Refuse junctions/symlinks that could route private data back into a repository.
$item=Get-Item -LiteralPath $targetPath
while($null -ne $item){
    if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Backup destination must not traverse junctions or symbolic links.'}
    $item=$item.Parent
}
$stem='medihelpers-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,8)
$sqlPath=Join-Path $targetPath ($stem+'.sql')
$logPath=Join-Path $targetPath ($stem+'.export.log')
$manifestPath=Join-Path $targetPath ($stem+'.verified.json')
$config=Join-Path $repoPath 'deploy/cloudflare.staging.jsonc'
& $NodePath $WranglerPath d1 export medihelpers-staging --remote --config $config --output $sqlPath *> $logPath
if($LASTEXITCODE -ne 0){throw 'Export failed. No verified manifest was created. Inspect the private export log.'}
& $PythonPath (Join-Path $PSScriptRoot 'verify-d1-backup.py') $sqlPath $manifestPath
if($LASTEXITCODE -ne 0){throw 'Backup failed validation. Keep the last known good backup; inspect this export privately.'}
Write-Output ('Verified backup manifest: '+$manifestPath)
# No deletion/rotation, upload, scheduling, DNS change or remote restoration.
