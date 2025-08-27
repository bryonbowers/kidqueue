@echo off
title Firebase Setup - KidQueue
color 0F
cls
echo.
echo ========================================
echo    🔥 Firebase Interactive Setup
echo ========================================
echo.
echo Instructions:
echo 1. Run: firebase login
echo 2. Run: firebase init
echo 3. Select: Firestore, Hosting, Storage
echo 4. Create new project: kidqueue-app
echo 5. Use defaults for most questions
echo.
echo Current directory: %CD%
echo.
echo ========================================
echo.
echo Starting Firebase login...
firebase login
echo.
echo Starting Firebase init...
firebase init
echo.
echo Setup complete! Press any key to continue...
pause