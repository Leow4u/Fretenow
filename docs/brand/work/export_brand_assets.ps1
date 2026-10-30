# Native WPF export from approved, reconstructed SVG paths. Source PNG is read-only.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName WindowsBase,PresentationCore,PresentationFramework
$root = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$svgDir = Join-Path $root 'docs\brand\assets\svg'
$logoDir = Join-Path $root 'output\brandbook\kit\logos\png'
$iconDir = Join-Path $root 'output\brandbook\kit\icons'
New-Item -ItemType Directory -Force -Path $logoDir,$iconDir | Out-Null
$invariant = [System.Globalization.CultureInfo]::InvariantCulture
$navy = '#0A1F4E'
$metadata = Get-Content -LiteralPath (Join-Path $root 'docs\brand\work\logo-geometry.json') -Raw | ConvertFrom-Json
$sourceHashBefore = (Get-FileHash -Algorithm SHA256 -LiteralPath $metadata.source.path).Hash.ToLowerInvariant()
if ($sourceHashBefore -ne $metadata.source.sha256) { throw 'Original reference hash mismatch before export.' }

function Draw-SvgPaths($dc,[string]$file,[double]$scale,[double]$x=0,[double]$y=0,[string]$overrideFill='') {
    [xml]$xml = [System.IO.File]::ReadAllText($file)
    $dc.PushTransform([System.Windows.Media.MatrixTransform]::new($scale,0,0,$scale,$x,$y))
    foreach($node in $xml.svg.path) {
        $fill = if($overrideFill) {$overrideFill} else {$node.fill}
        $brush = [System.Windows.Media.BrushConverter]::new().ConvertFromString($fill)
        $dc.DrawGeometry($brush,$null,[System.Windows.Media.Geometry]::Parse(('F0 '+$node.d)))
    }
    $dc.Pop()
}

function Save-Png($visual,[int]$width,[int]$height,[string]$target) {
    $bitmap = [System.Windows.Media.Imaging.RenderTargetBitmap]::new($width,$height,96,96,[System.Windows.Media.PixelFormats]::Pbgra32)
    $bitmap.Render($visual)
    $encoder = [System.Windows.Media.Imaging.PngBitmapEncoder]::new()
    $pngMetadata = [System.Windows.Media.Imaging.BitmapMetadata]::new('png')
    $pngMetadata.SetQuery('/sRGB/RenderingIntent',[byte]0)
    $frame = [System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap,$null,$pngMetadata,$null)
    $encoder.Frames.Add($frame)
    $stream = [System.IO.File]::Create($target)
    try {$encoder.Save($stream)} finally {$stream.Dispose()}
}

function Svg-Layer([int]$size,[double]$markWidth,[string]$kind,[string]$file) {
    $head = '<svg xmlns="http://www.w3.org/2000/svg" width="'+$size+'" height="'+$size+'" viewBox="0 0 '+$size+' '+$size+'"><title>FreteNow — '+$kind+' preparation layer</title>'
    if($kind -eq 'background') {
        $body = '<rect width="'+$size+'" height="'+$size+'" fill="'+$navy+'"/>'
    } else {
        $scale = $markWidth / 253
        $x = ($size-$markWidth)/2
        $y = ($size-255*$scale)/2
        $transform = 'matrix('+($scale.ToString('0.#########',$invariant))+' 0 0 '+($scale.ToString('0.#########',$invariant))+' '+($x.ToString('0.#########',$invariant))+' '+($y.ToString('0.#########',$invariant))+')'
        [xml]$markXml = [System.IO.File]::ReadAllText((Join-Path $svgDir 'fretenow-simbolo-reverso.svg'))
        $body = '<g transform="'+$transform+'">'
        foreach($node in $markXml.svg.path) {
            $fill=if($kind -eq 'monochrome') {'#FFFFFF'} else {$node.fill}
            $body += '<path fill="'+$fill+'" fill-rule="evenodd" d="'+$node.d+'"/>'
        }
        $body += '</g>'
    }
    [System.IO.File]::WriteAllText($file,($head+$body+'</svg>'),[System.Text.UTF8Encoding]::new($false))
}

function Icon-Png([string]$name,[int]$size,[double]$markWidth,[string]$kind='composite') {
    $visual=[System.Windows.Media.DrawingVisual]::new()
    $dc=$visual.RenderOpen()
    if($kind -in @('composite','background')) {
        $brush=[System.Windows.Media.BrushConverter]::new().ConvertFromString($navy)
        $dc.DrawRectangle($brush,$null,[System.Windows.Rect]::new(0,0,$size,$size))
    }
    if($kind -ne 'background') {
        $scale=$markWidth/253
        $x=($size-$markWidth)/2
        $y=($size-255*$scale)/2
        $overrideFill=if($kind -eq 'monochrome') {'#FFFFFF'} else {''}
        Draw-SvgPaths $dc (Join-Path $svgDir 'fretenow-simbolo-reverso.svg') $scale $x $y $overrideFill
    }
    $dc.Close()
    Save-Png $visual $size $size (Join-Path $iconDir $name)
}

# Preserve the intrinsic symbol aspect ratio; 512 is the longest side.
foreach($file in Get-ChildItem -LiteralPath $svgDir -Filter '*.svg') {
    [xml]$xml=[System.IO.File]::ReadAllText($file.FullName)
    $viewBox=$xml.svg.viewBox -split ' '
    $nativeWidth=[double]::Parse($viewBox[2],$invariant)
    $nativeHeight=[double]::Parse($viewBox[3],$invariant)
    if($file.Name -like '*logo-horizontal*') {$width=2620;$height=510;$scale=2.0}
    else {$scale=512/[math]::Max($nativeWidth,$nativeHeight);$width=[int][math]::Round($nativeWidth*$scale);$height=[int][math]::Round($nativeHeight*$scale)}
    $visual=[System.Windows.Media.DrawingVisual]::new()
    $dc=$visual.RenderOpen()
    Draw-SvgPaths $dc $file.FullName $scale 0 0
    $dc.Close()
    Save-Png $visual $width $height (Join-Path $logoDir ($file.BaseName+'.png'))
}

Icon-Png 'fretenow-ios-1024.png' 1024 (1024*0.56)
Icon-Png 'fretenow-play-store-512.png' 512 (512*0.56)
Icon-Png 'fretenow-web-192.png' 192 (192*0.56)
Icon-Png 'fretenow-web-512.png' 512 (512*0.56)
foreach($size in @(16,32,48,180)) {Icon-Png ('fretenow-favicon-'+$size+'.png') $size ($size*0.72)}
Icon-Png 'fretenow-android-background-432.png' 432 240 'background'
# 236 px = 59 dp at 4x. This preserves margin in the 66 dp safe circle.
Icon-Png 'fretenow-android-foreground-432.png' 432 236 'foreground'
Icon-Png 'fretenow-android-monochrome-432.png' 432 236 'monochrome'
foreach($kind in @('background','foreground','monochrome')) {Svg-Layer 432 236 $kind (Join-Path $iconDir ('fretenow-android-'+$kind+'-432.svg'))}
foreach($kind in @('background','foreground')) {Svg-Layer 1024 (1024*0.56) $kind (Join-Path $iconDir ('fretenow-ios-'+$kind+'-1024.svg'))}

$sourceHashAfter=(Get-FileHash -Algorithm SHA256 -LiteralPath $metadata.source.path).Hash.ToLowerInvariant()
if($sourceHashAfter -ne $sourceHashBefore) {throw 'Original reference changed during export.'}
$playFile=Get-Item -LiteralPath (Join-Path $iconDir 'fretenow-play-store-512.png')
if($playFile.Length -ge 1048576) {throw 'Play Store PNG exceeds 1024 KB.'}
Write-Output ('Exported '+(Get-ChildItem -LiteralPath $logoDir -Filter '*.png').Count+' logo PNGs and '+(Get-ChildItem -LiteralPath $iconDir).Count+' icon assets. Original SHA-256 unchanged. Play PNG: '+$playFile.Length+' bytes.')
