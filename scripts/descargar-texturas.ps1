# Descarga las texturas PBR del Gran Comedor desde Poly Haven (licencia CC0).
# Uso, desde la raíz del repo:
#   powershell -ExecutionPolicy Bypass -File scripts\descargar-texturas.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$destino = "public\textures\gran-comedor"
New-Item -ItemType Directory -Force $destino | Out-Null

# medieval_blocks_03: paredes, arcos y columnas
# floor_tiles_02:     piso de losas de piedra
# dark_wood:          mesas y bancos
$texturas = @("medieval_blocks_03", "floor_tiles_02", "dark_wood")
$mapas = @("diff", "nor_gl", "rough")

foreach ($t in $texturas) {
  foreach ($m in $mapas) {
    $archivo = "${t}_${m}_1k.jpg"
    $url = "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/$t/$archivo"
    Write-Host "Bajando $archivo"
    Invoke-WebRequest -Uri $url -OutFile (Join-Path $destino $archivo) -UseBasicParsing
  }
}

$total = (Get-ChildItem $destino -Filter *.jpg).Count
Write-Host "Listo: $total archivos en $destino"
