Add-Type -AssemblyName System.Drawing
$imagePath = "c:\Users\Usuario\Documents\Angular\invitacion-boda-daniela-john-front\src\assets\images\og-invitacion.png"
$destPath = "c:\Users\Usuario\Documents\Angular\invitacion-boda-daniela-john-front\src\assets\images\og-invitacion.jpg"

$image = [System.Drawing.Image]::FromFile($imagePath)
$newWidth = 600
$newHeight = [math]::Round($image.Height * ($newWidth / $image.Width))

$bitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($image, 0, 0, $newWidth, $newHeight)

$bitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

$graphics.Dispose()
$bitmap.Dispose()
$image.Dispose()

Write-Host "Imagen redimensionada y guardada como JPEG en $destPath"
