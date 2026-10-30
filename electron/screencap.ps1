param(
    [string]$OutFile,
    [int]$X = -1,
    [int]$Y = -1,
    [int]$Width = -1,
    [int]$Height = -1
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bounds = $screen.Bounds
    
    $captureX = if ($X -ge 0) { $X } else { $bounds.X }
    $captureY = if ($Y -ge 0) { $Y } else { $bounds.Y }
    $captureW = if ($Width -gt 0) { $Width } else { $bounds.Width }
    $captureH = if ($Height -gt 0) { $Height } else { $bounds.Height }

    $bitmap = New-Object System.Drawing.Bitmap $captureW, $captureH
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $point = New-Object System.Drawing.Point($captureX, $captureY)
    $size = New-Object System.Drawing.Size($captureW, $captureH)
    
    $graphics.CopyFromScreen($point, [System.Drawing.Point]::Empty, $size)
    $bitmap.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Output "SUCCESS"
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
