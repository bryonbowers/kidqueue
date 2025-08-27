# PowerShell script to automate Firebase setup
Add-Type -AssemblyName System.Windows.Forms

Write-Host "🔥 Automated Firebase Setup Starting..." -ForegroundColor Green

# Change to project directory
Set-Location "C:\git\kidqueue"

# Function to send keys with delay
function Send-KeysWithDelay {
    param([string]$keys, [int]$delay = 2000)
    Start-Sleep -Milliseconds $delay
    [System.Windows.Forms.SendKeys]::SendWait($keys)
}

# Start Firebase login
Write-Host "Step 1: Firebase Login" -ForegroundColor Yellow
Start-Process -FilePath "firebase" -ArgumentList "login" -Wait

# Start Firebase init
Write-Host "Step 2: Firebase Init" -ForegroundColor Yellow
$process = Start-Process -FilePath "firebase" -ArgumentList "init" -PassThru

# Wait for process to start
Start-Sleep -Seconds 3

# Send keystrokes for Firebase init prompts
Write-Host "Sending automated responses..." -ForegroundColor Green

# Are you ready to proceed? (Y/n)
Send-KeysWithDelay "Y{ENTER}"

# Which Firebase features do you want to set up?
# Use arrow keys and space to select: Firestore, Hosting, Storage
Send-KeysWithDelay " {DOWN} {DOWN}{SPACE}{DOWN}{SPACE}{DOWN}{DOWN}{DOWN}{SPACE}{ENTER}"

# Please select an option: Create a new project
Send-KeysWithDelay "{ENTER}"

# Please specify a unique project id: kidqueue-app
Send-KeysWithDelay "kidqueue-app{ENTER}"

# What do you want to use as your public directory? (public)
Send-KeysWithDelay "packages/web/dist{ENTER}"

# Configure as a single-page app? (y/N)
Send-KeysWithDelay "y{ENTER}"

# Set up automatic builds and deploys with GitHub? (y/N)
Send-KeysWithDelay "N{ENTER}"

Write-Host "Automated setup complete!" -ForegroundColor Green
Write-Host "Check the command window for any additional prompts." -ForegroundColor Yellow