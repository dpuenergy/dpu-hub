param(
    [Parameter(Mandatory = $true)]
    [string]$RootPath,

    [int]$MaxFullPathLength = 240,

    [int]$MinBaseNameLength = 8,

    [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Remove-Diacritics {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $Text
    }

    $normalized = $Text.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder

    foreach ($char in $normalized.ToCharArray()) {
        $unicodeCategory = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
        if ($unicodeCategory -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($char)
        }
    }

    return $sb.ToString().Normalize([Text.NormalizationForm]::FormC)
}

function Sanitize-NamePart {
    param([string]$Text)

    $textNoDiacritics = Remove-Diacritics -Text $Text
    $sanitized = $textNoDiacritics -replace '[<>:"/\\|?*]', '_'
    $sanitized = $sanitized -replace '\s+', '_'
    $sanitized = $sanitized -replace '_+', '_'
    $sanitized = $sanitized.Trim(' ', '.', '_')

    if ([string]::IsNullOrWhiteSpace($sanitized)) {
        return "item"
    }

    return $sanitized
}

function Get-ShortHash {
    param([string]$InputText)

    $sha1 = [System.Security.Cryptography.SHA1]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($InputText)
        $hashBytes = $sha1.ComputeHash($bytes)
        $hashHex = [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLowerInvariant()
        return $hashHex.Substring(0, 8)
    }
    finally {
        $sha1.Dispose()
    }
}

function Get-ChildDirectoriesSafe {
    param([string]$Path)

    try {
        return [System.IO.Directory]::GetDirectories($Path)
    }
    catch {
        Write-Warning "Nelze naèíst podsložky: $Path :: $($_.Exception.Message)"
        return @()
    }
}

function Get-ChildFilesSafe {
    param([string]$Path)

    try {
        return [System.IO.Directory]::GetFiles($Path)
    }
    catch {
        Write-Warning "Nelze naèíst soubory: $Path :: $($_.Exception.Message)"
        return @()
    }
}

function Get-AllDirectoriesDeepestFirst {
    param([string]$StartPath)

    $result = New-Object System.Collections.Generic.List[string]
    $stack = New-Object System.Collections.Generic.Stack[string]
    $stack.Push($StartPath)

    while ($stack.Count -gt 0) {
        $current = $stack.Pop()
        $children = Get-ChildDirectoriesSafe -Path $current

        foreach ($child in $children) {
            $stack.Push($child)
            $result.Add($child)
        }
    }

    return $result | Sort-Object Length -Descending
}

function Get-AllDirectoriesTopDown {
    param([string]$StartPath)

    $result = New-Object System.Collections.Generic.List[string]
    $queue = New-Object System.Collections.Generic.Queue[string]
    $queue.Enqueue($StartPath)

    while ($queue.Count -gt 0) {
        $current = $queue.Dequeue()
        $children = Get-ChildDirectoriesSafe -Path $current

        foreach ($child in $children) {
            $result.Add($child)
            $queue.Enqueue($child)
        }
    }

    return $result
}

function Get-UniqueDirectoryPath {
    param(
        [string]$ParentPath,
        [string]$BaseName,
        [int]$MaxFullPathLength,
        [int]$MinBaseNameLength
    )

    $hash = Get-ShortHash -InputText ($ParentPath + "|" + $BaseName)
    $suffixBase = "_" + $hash
    $counter = 0

    while ($true) {
        $suffix = if ($counter -eq 0) { $suffixBase } else { $suffixBase + "_" + $counter }
        $allowedBaseLength = $MaxFullPathLength - $ParentPath.Length - 1 - $suffix.Length

        if ($allowedBaseLength -lt $MinBaseNameLength) {
            $allowedBaseLength = $MinBaseNameLength
        }

        $trimmedBase = if ($BaseName.Length -gt $allowedBaseLength) {
            $BaseName.Substring(0, $allowedBaseLength)
        } else {
            $BaseName
        }

        $trimmedBase = $trimmedBase.Trim(' ', '.', '_')
        if ([string]::IsNullOrWhiteSpace($trimmedBase)) {
            $trimmedBase = "folder"
        }

        $candidateName = $trimmedBase + $suffix
        $candidatePath = Join-Path $ParentPath $candidateName

        if (-not [System.IO.Directory]::Exists($candidatePath)) {
            return $candidatePath
        }

        $counter++
    }
}

function Get-UniqueFilePath {
    param(
        [string]$DirectoryPath,
        [string]$BaseName,
        [string]$Extension,
        [int]$MaxFullPathLength,
        [int]$MinBaseNameLength
    )

    $hash = Get-ShortHash -InputText ($DirectoryPath + "|" + $BaseName + "|" + $Extension)
    $suffixBase = "_" + $hash
    $counter = 0

    while ($true) {
        $suffix = if ($counter -eq 0) { $suffixBase } else { $suffixBase + "_" + $counter }
        $allowedBaseLength = $MaxFullPathLength - $DirectoryPath.Length - 1 - $Extension.Length - $suffix.Length

        if ($allowedBaseLength -lt $MinBaseNameLength) {
            $allowedBaseLength = $MinBaseNameLength
        }

        $trimmedBase = if ($BaseName.Length -gt $allowedBaseLength) {
            $BaseName.Substring(0, $allowedBaseLength)
        } else {
            $BaseName
        }

        $trimmedBase = $trimmedBase.Trim(' ', '.', '_')
        if ([string]::IsNullOrWhiteSpace($trimmedBase)) {
            $trimmedBase = "file"
        }

        $candidateName = $trimmedBase + $suffix + $Extension
        $candidatePath = Join-Path $DirectoryPath $candidateName

        if (-not [System.IO.File]::Exists($candidatePath)) {
            return $candidatePath
        }

        $counter++
    }
}

if (-not (Test-Path -LiteralPath $RootPath)) {
    throw "Zadaná cesta neexistuje: $RootPath"
}

$rootItem = Get-Item -LiteralPath $RootPath
if (-not $rootItem.PSIsContainer) {
    throw "RootPath musí být složka, ne soubor."
}

Write-Host ""
Write-Host "Kontroluji: $RootPath"
Write-Host "Max délka cesty: $MaxFullPathLength"
if ($WhatIf) {
    Write-Host "Režim WhatIf: zmìny se jen vypíšou."
}
Write-Host ""

$renamedDirs = 0
$renamedFiles = 0
$skipped = 0
$errors = 0

# 1) Nejdøív složky od nejhlubších
$dirs = Get-AllDirectoriesDeepestFirst -StartPath $RootPath

foreach ($dirPath in $dirs) {
    try {
        if ($dirPath.Length -le $MaxFullPathLength) {
            continue
        }

        $parentPath = Split-Path $dirPath -Parent
        $dirName = Split-Path $dirPath -Leaf
        $cleanName = Sanitize-NamePart -Text $dirName

        $targetPath = Get-UniqueDirectoryPath `
            -ParentPath $parentPath `
            -BaseName $cleanName `
            -MaxFullPathLength $MaxFullPathLength `
            -MinBaseNameLength $MinBaseNameLength

        if ($targetPath.Length -gt $MaxFullPathLength) {
            Write-Warning "Nelze dostateènì zkrátit složku: $dirPath"
            $skipped++
            continue
        }

        Write-Host "PØEJMENOVAT SLOŽKU:"
        Write-Host "  Pùvodní: $dirPath"
        Write-Host "  Nový:    $targetPath"
        Write-Host ""

        if (-not $WhatIf) {
            [System.IO.Directory]::Move($dirPath, $targetPath)
        }

        $renamedDirs++
    }
    catch {
        Write-Warning "Chyba u složky '$dirPath' :: $($_.Exception.Message)"
        $errors++
    }
}

# 2) Pak znovu projít strom shora a øešit soubory
$allDirs = New-Object System.Collections.Generic.List[string]
$allDirs.Add($RootPath)
(Get-AllDirectoriesTopDown -StartPath $RootPath) | ForEach-Object { $allDirs.Add($_) }

foreach ($dir in $allDirs) {
    $files = Get-ChildFilesSafe -Path $dir

    foreach ($filePath in $files) {
        try {
            if ($filePath.Length -le $MaxFullPathLength) {
                continue
            }

            $directoryPath = Split-Path $filePath -Parent
            $fileName = Split-Path $filePath -Leaf
            $extension = [System.IO.Path]::GetExtension($fileName)
            $baseName = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
            $cleanBaseName = Sanitize-NamePart -Text $baseName

            $targetPath = Get-UniqueFilePath `
                -DirectoryPath $directoryPath `
                -BaseName $cleanBaseName `
                -Extension $extension `
                -MaxFullPathLength $MaxFullPathLength `
                -MinBaseNameLength $MinBaseNameLength

            if ($targetPath.Length -gt $MaxFullPathLength) {
                Write-Warning "Nelze dostateènì zkrátit soubor: $filePath"
                $skipped++
                continue
            }

            Write-Host "PØEJMENOVAT SOUBOR:"
            Write-Host "  Pùvodní: $filePath"
            Write-Host "  Nový:    $targetPath"
            Write-Host ""

            if (-not $WhatIf) {
                [System.IO.File]::Move($filePath, $targetPath)
            }

            $renamedFiles++
        }
        catch {
            Write-Warning "Chyba u souboru '$filePath' :: $($_.Exception.Message)"
            $errors++
        }
    }
}

Write-Host ""
Write-Host "Hotovo."
Write-Host "Pøejmenované složky: $renamedDirs"
Write-Host "Pøejmenované soubory: $renamedFiles"
Write-Host "Pøeskoèeno: $skipped"
Write-Host "Chyby: $errors"
Write-Host ""