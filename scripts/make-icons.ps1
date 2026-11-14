# Genera los iconos PNG de la PWA (192, 512 y maskable 512) sin dependencias,
# dibujando el logotipo con System.Drawing. Uso (Windows):
#   powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [string]$path, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $brand = [System.Drawing.ColorTranslator]::FromHtml('#0f4c75')
  $accent = [System.Drawing.ColorTranslator]::FromHtml('#3bc9a4')

  if ($maskable) {
    # Fondo a sangre completa: el sistema recorta con su propia máscara.
    $g.Clear($brand)
    $pad = [int]($size * 0.2)
  } else {
    $g.Clear([System.Drawing.Color]::Transparent)
    $r = [int]($size * 0.22)
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc(0, 0, $r, $r, 180, 90)
    $gp.AddArc($size - $r, 0, $r, $r, 270, 90)
    $gp.AddArc($size - $r, $size - $r, $r, $r, 0, 90)
    $gp.AddArc(0, $size - $r, $r, $r, 90, 90)
    $gp.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush $brand), $gp)
    $pad = [int]($size * 0.12)
  }

  $inner = $size - 2 * $pad
  $font = New-Object System.Drawing.Font 'Segoe UI', ([single]($inner * 0.62)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'
  $fmt.LineAlignment = 'Center'
  $rect = New-Object System.Drawing.RectangleF ([single]$pad), ([single]($pad - $inner * 0.03)), ([single]$inner), ([single]$inner)
  $g.DrawString('N', $font, [System.Drawing.Brushes]::White, $rect, $fmt)

  $d = [int]($inner * 0.16)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $accent), [int]($pad + $inner * 0.74), [int]($pad + $inner * 0.7), $d, $d)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$out = Join-Path $PSScriptRoot '..\public'
New-Icon 192 (Join-Path $out 'pwa-192x192.png') $false
New-Icon 512 (Join-Path $out 'pwa-512x512.png') $false
New-Icon 512 (Join-Path $out 'maskable-512x512.png') $true
New-Icon 180 (Join-Path $out 'apple-touch-icon.png') $true
Write-Output 'Iconos generados en public/'
