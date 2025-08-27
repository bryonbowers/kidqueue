@echo off
echo 🔥 Firebase Interactive Setup
echo.
echo This will run Firebase commands in interactive mode.
echo You'll be able to control all prompts.
echo.
echo Step 1: Login to Firebase
firebase login
echo.
echo Step 2: Initialize Firebase project
firebase init
echo.
echo Step 3: Use your project (replace PROJECT_ID with your actual project ID)
echo firebase use PROJECT_ID
echo.
echo Step 4: Deploy
echo firebase deploy
echo.
echo When ready to deploy, run: firebase deploy
echo.
pause