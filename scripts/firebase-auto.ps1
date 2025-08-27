# PowerShell script to automate Firebase setup
Write-Host "🔥 Starting Firebase Setup..." -ForegroundColor Green

# Change to project directory
Set-Location "C:\git\kidqueue"

# Step 1: Firebase Login
Write-Host "Step 1: Running firebase login..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "firebase", "login" -Wait

# Step 2: Firebase Init with automated responses
Write-Host "Step 2: Running firebase init..." -ForegroundColor Yellow

# Create expect-like script for Windows
$initScript = @"
firebase login
firebase init
"@

# Run firebase init in a new window where user can interact
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d C:\git\kidqueue && echo Step 1: firebase login && echo Step 2: firebase init && echo Step 3: Select Firestore, Hosting, Storage && echo Step 4: Create new project: kidqueue-app && echo. && firebase login"

Write-Host "Interactive window opened!" -ForegroundColor Green
Write-Host "Complete the Firebase setup in the new window." -ForegroundColor Yellow