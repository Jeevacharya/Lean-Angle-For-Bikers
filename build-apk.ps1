# MotoLean Native APK Build Script
$ErrorActionPreference = "Stop"

$sdkDir = "C:\Users\jeeva\AppData\Local\Android\Sdk"
$buildToolsDir = "$sdkDir\build-tools\35.0.0"
$platformJar = "$sdkDir\platforms\android-34\android.jar"
$jbrBin = "C:\Program Files\Android\Android Studio\jbr\bin"

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$jbrBin;$env:PATH"

$aapt2 = "$buildToolsDir\aapt2.exe"
$d8Jar = "$buildToolsDir\lib\d8.jar"
$zipalign = "$buildToolsDir\zipalign.exe"
$apksignerJar = "$buildToolsDir\lib\apksigner.jar"

$java = "$jbrBin\java.exe"
$javac = "$jbrBin\javac.exe"
$jar = "$jbrBin\jar.exe"
$keytool = "$jbrBin\keytool.exe"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  BUILDING MOTO LEAN ANDROID APK" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Clean previous build artifacts
$buildDir = "android\build"
if (Test-Path "$buildDir\obj") { Remove-Item "$buildDir\obj\*" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "$buildDir\gen") { Remove-Item "$buildDir\gen\*" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "$buildDir\apk") { Remove-Item "$buildDir\apk\*" -Recurse -Force -ErrorAction SilentlyContinue }

New-Item -ItemType Directory -Path "$buildDir\obj", "$buildDir\gen", "$buildDir\apk" -Force | Out-Null

# 1. Compile Android Resources
Write-Host "[1/6] Compiling resources with aapt2..." -ForegroundColor Yellow
& $aapt2 compile --dir android\res -o "$buildDir\compiled_res.zip"

# 2. Link Resources & Generate R.java
Write-Host "[2/6] Linking resources and generating R.java..." -ForegroundColor Yellow
& $aapt2 link -I $platformJar --manifest android\AndroidManifest.xml -o "$buildDir\apk\unaligned.apk" --java "$buildDir\gen" "$buildDir\compiled_res.zip" --auto-add-overlay

# 3. Compile Java Source Files
Write-Host "[3/6] Compiling Java sources with javac..." -ForegroundColor Yellow
$javaFiles = Get-ChildItem -Path "android\src", "$buildDir\gen" -Filter "*.java" -Recurse | Select-Object -ExpandProperty FullName
& $javac -encoding UTF-8 -cp $platformJar -d "$buildDir\obj" -source 8 -target 8 $javaFiles

# 4. Dexing bytecode with D8
Write-Host "[4/6] Converting classes to Dalvik DEX with D8..." -ForegroundColor Yellow
$classFiles = Get-ChildItem -Path "$buildDir\obj" -Filter "*.class" -Recurse | Select-Object -ExpandProperty FullName
& $java -Xmx1024M -cp $d8Jar com.android.tools.r8.D8 --lib $platformJar --output "$buildDir\apk" $classFiles

# 5. Add classes.dex into unaligned.apk
Write-Host "[5/6] Packaging classes.dex into APK..." -ForegroundColor Yellow
Push-Location "$buildDir\apk"
try {
    & $jar -uf "unaligned.apk" "classes.dex"
} finally {
    Pop-Location
}

# 6. ZipAlign APK
Write-Host "[6/6] Zipaligning and signing APK..." -ForegroundColor Yellow
& $zipalign -f -p 4 "$buildDir\apk\unaligned.apk" "$buildDir\apk\aligned.apk"

# Generate debug keystore if missing
$keystore = "android\debug.keystore"
if (-not (Test-Path $keystore)) {
    Write-Host "Generating debug keystore..." -ForegroundColor Gray
    & $keytool -genkeypair -keystore $keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=MotoLean, OU=Biker, O=App, C=US"
}

# Sign APK with apksigner
$finalApk = "MotoLean.apk"
if (Test-Path $finalApk) { Remove-Item $finalApk -Force }
& $java -jar $apksignerJar sign --ks $keystore --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out $finalApk "$buildDir\apk\aligned.apk"

# Also copy to public/ folder so user can download it directly from their phone over Wi-Fi!
Copy-Item $finalApk "public\MotoLean.apk" -Force

$apkSize = (Get-Item $finalApk).Length / 1KB
Write-Host "`nSUCCESS! Generated APK: $finalApk ($([math]::Round($apkSize, 1)) KB)" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
