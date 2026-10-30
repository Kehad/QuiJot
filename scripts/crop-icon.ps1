Add-Type -AssemblyName System.Drawing

$srcPath = "$PSScriptRoot\..\assests\web\icon-512x512.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source icon not found at $srcPath"
    exit 1
}

# Load image safely without locking the file
$bytes = [System.IO.File]::ReadAllBytes($srcPath)
$ms = New-Object System.IO.MemoryStream(,$bytes)
$srcBmp = [System.Drawing.Bitmap]::FromStream($ms)

$width = $srcBmp.Width
$height = $srcBmp.Height

$minX = $width
$maxX = 0
$minY = $height
$maxY = 0

for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $pixel = $srcBmp.GetPixel($x, $y)
        if ($pixel.A -gt 15) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "Detected content bounds: X: $minX..$maxX, Y: $minY..$maxY"

$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1

# Standard Windows icon padding: ~3-4% margin (16px on 512px canvas)
# This lets the icon occupy ~94% of the canvas, matching standard Windows taskbar icons
$targetSize = 512
$margin = 16
$destW = $targetSize - ($margin * 2)
$destH = $targetSize - ($margin * 2)

$scale = [Math]::Min($destW / $cropW, $destH / $cropH)
$renderW = [int]($cropW * $scale)
$renderH = [int]($cropH * $scale)
$destX = [int](($targetSize - $renderW) / 2)
$destY = [int](($targetSize - $renderH) / 2)

$newBmp = New-Object System.Drawing.Bitmap $targetSize, $targetSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($newBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$srcRect = New-Object System.Drawing.Rectangle $minX, $minY, $cropW, $cropH
$destRect = New-Object System.Drawing.Rectangle $destX, $destY, $renderW, $renderH

$g.DrawImage($srcBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# Save backup of original if not already saved
$backupPath = "$PSScriptRoot\..\assests\web\icon-512x512.original.png"
if (-not (Test-Path $backupPath)) {
    [System.IO.File]::WriteAllBytes($backupPath, $bytes)
}

# Overwrite with cropped, full-size 512x512 icon
$newBmp.Save($srcPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Update other resolutions
$sizes = @(
    @{ Name = "icon-192x192.png"; Size = 192 },
    @{ Name = "apple-touch-icon.png"; Size = 180 },
    @{ Name = "favicon-48x48.png"; Size = 48 },
    @{ Name = "favicon-32x32.png"; Size = 32 },
    @{ Name = "favicon-16x16.png"; Size = 16 }
)

foreach ($item in $sizes) {
    $s = $item.Size
    $smallBmp = New-Object System.Drawing.Bitmap $s, $s, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $sg = [System.Drawing.Graphics]::FromImage($smallBmp)
    $sg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $sg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $sg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $sg.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $sg.DrawImage($newBmp, 0, 0, $s, $s)
    $smallPath = "$PSScriptRoot\..\assests\web\$($item.Name)"
    $smallBmp.Save($smallPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $sg.Dispose()
    $smallBmp.Dispose()
}

$g.Dispose()
$newBmp.Dispose()
$srcBmp.Dispose()
$ms.Dispose()

Write-Output "SUCCESS: Icon trimmed and scaled to standard full taskbar size!"
