Add-Type -AssemblyName System.Drawing

function AutoCrop-Image($inputPath, $outputPath) {
    $bmp = [System.Drawing.Bitmap]::FromFile($inputPath)
    $bgColor = $bmp.GetPixel(0, 0)
    
    $minX = $bmp.Width
    $minY = $bmp.Height
    $maxX = 0
    $maxY = 0

    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $pixel = $bmp.GetPixel($x, $y)
            # Check if different from bg color with tolerance
            if ([Math]::Abs($pixel.R - $bgColor.R) -gt 10 -or 
                [Math]::Abs($pixel.G - $bgColor.G) -gt 10 -or 
                [Math]::Abs($pixel.B - $bgColor.B) -gt 10) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    if ($minX -ge $maxX -or $minY -ge $maxY) {
        Write-Host "Could not find content to crop in $inputPath"
        $bmp.Dispose()
        return
    }

    # Add a small 10px padding
    $padding = 10
    $minX = [Math]::Max(0, $minX - $padding)
    $minY = [Math]::Max(0, $minY - $padding)
    $maxX = [Math]::Min($bmp.Width - 1, $maxX + $padding)
    $maxY = [Math]::Min($bmp.Height - 1, $maxY + $padding)

    $rect = New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
    $croppedBmp = $bmp.Clone($rect, $bmp.PixelFormat)
    
    # Save as PNG
    $bmp.Dispose()
    
    # We must save to a new file or overwrite
    $croppedBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $croppedBmp.Dispose()
    
    Write-Host "Cropped $inputPath to $outputPath"
}

AutoCrop-Image -inputPath "$PWD\public\images\logo-light.png" -outputPath "$PWD\public\images\logo-light-cropped.png"
AutoCrop-Image -inputPath "$PWD\public\images\logo-dark.png" -outputPath "$PWD\public\images\logo-dark-cropped.png"
