@echo off
echo Step 1: Clearing bad Gradle cache...
rmdir /s /q "%USERPROFILE%\.gradle\caches\8.6\scripts" 2>nul
echo Done.

echo.
echo Step 2: Building Android app with Java 17...
cd /d "D:\Aaron\Project\Axxess 2026\Axxess-2026\AIHealthPartnerRN"
npx expo run:android

pause
