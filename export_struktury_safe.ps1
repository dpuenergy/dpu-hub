param(
    [Parameter(Mandatory = $true)]
    [string]$RootPath,

    [Parameter(Mandatory = $false)]
    [string]$OutputFolder = ".\export_struktury"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

if (!(Test-Path -LiteralPath $RootPath)) {
    Write-Error "Zadaná cesta neexistuje: $RootPath"
    exit 1
}

$RootPath = (Resolve-Path -LiteralPath $RootPath).Path

if (!(Test-Path -LiteralPath $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder | Out-Null
}
$OutputFolder = (Resolve-Path -LiteralPath $OutputFolder).Path

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

$csvPath = Join-Path $OutputFolder "struktura_$timestamp.csv"
$treePath = Join-Path $OutputFolder "strom_$timestamp.txt"
$errorLogPath = Join-Path $OutputFolder "chyby_$timestamp.txt"

Write-Host "Nacitam obsah: $RootPath"
Write-Host "Vystup CSV: $csvPath"
Write-Host "Vystup stromu: $treePath"
Write-Host "Log chyb: $errorLogPath"

$results = New-Object System.Collections.Generic.List[object]
$errors = New-Object System.Collections.Generic.List[string]

function Add-ItemRecord {
    param(
        [Parameter(Mandatory = $true)]
        $Item
    )

    $relativePath = $Item.FullName.Substring($RootPath.Length).TrimStart('\')

    $results.Add([PSCustomObject]@{
        RelativePath  = $relativePath
        Name          = $Item.Name
        ParentFolder  = Split-Path $relativePath -Parent
        ItemType      = if ($Item.PSIsContainer) { "Folder" } else { "File" }
        Extension     = if ($Item.PSIsContainer) { "" } else { $Item.Extension }
        SizeBytes     = if ($Item.PSIsContainer) { $null } else { $Item.Length }
        LastWriteTime = $Item.LastWriteTime
        FullPath      = $Item.FullName
    })
}

function Walk-Tree {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CurrentPath
    )

    try {
        $children = Get-ChildItem -LiteralPath $CurrentPath -Force -ErrorAction Stop
    }
    catch {
        $errors.Add("NELZE CIST: $CurrentPath`r`n$($_.Exception.Message)`r`n")
        return
    }

    foreach ($child in $children) {
        try {
            Add-ItemRecord -Item $child

            if ($child.PSIsContainer) {
                Walk-Tree -CurrentPath $child.FullName
            }
        }
        catch {
            $errors.Add("CHYBA POLOZKY: $($child.FullName)`r`n$($_.Exception.Message)`r`n")
        }
    }
}

# Přidá i root složku jako referenci
$rootItem = Get-Item -LiteralPath $RootPath
$results.Add([PSCustomObject]@{
    RelativePath  = "."
    Name          = $rootItem.Name
    ParentFolder  = ""
    ItemType      = "Folder"
    Extension     = ""
    SizeBytes     = $null
    LastWriteTime = $rootItem.LastWriteTime
    FullPath      = $rootItem.FullName
})

Walk-Tree -CurrentPath $RootPath

$results |
    Sort-Object FullPath |
    Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8

try {
    cmd /c tree "$RootPath" /F /A > "$treePath"
}
catch {
    $errors.Add("TREE EXPORT SELHAL`r`n$($_.Exception.Message)`r`n")
}

if ($errors.Count -gt 0) {
    $errors | Out-File -FilePath $errorLogPath -Encoding utf8
    Write-Host ""
    Write-Host "Dokonceno s upozornenim. Nektere cesty nesly precist."
    Write-Host "Viz log: $errorLogPath"
}
else {
    "Bez chyb." | Out-File -FilePath $errorLogPath -Encoding utf8
    Write-Host ""
    Write-Host "Hotovo bez chyb."
}

Write-Host "CSV:  $csvPath"
Write-Host "TREE: $treePath"