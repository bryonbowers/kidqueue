#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Creating Firebase Demo App...\n');

// Create a simple demo HTML file that works immediately
const demoHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KidQueue - Coming Soon</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #1976d2, #42a5f5);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        h2 {
            font-size: 1.5rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .features {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 2rem;
            margin: 2rem 0;
            backdrop-filter: blur(10px);
        }
        .feature {
            margin: 1rem 0;
            font-size: 1.1rem;
        }
        .status {
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid #4caf50;
            border-radius: 5px;
            padding: 1rem;
            margin: 2rem 0;
        }
        .emoji {
            font-size: 2rem;
            margin: 0 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 KidQueue</h1>
        <h2>School Pickup Made Simple</h2>
        
        <div class="features">
            <h3>🚀 Features</h3>
            <div class="feature">📱 QR Code Scanning for Quick Pickup</div>
            <div class="feature">⚡ Real-time Queue Updates</div>
            <div class="feature">🔐 Secure Google & Facebook Login</div>
            <div class="feature">📊 Teacher Dashboard for Queue Management</div>
            <div class="feature">🖨️ Printable QR Code Stickers for Vehicles</div>
            <div class="feature">📳 Progressive Web App (Downloadable)</div>
        </div>

        <div class="status">
            <h3>✅ Firebase Setup Complete!</h3>
            <p>🔥 Project: <strong>kidqueue-app</strong></p>
            <p>🌐 Hosting: <strong>Ready for Deployment</strong></p>
            <p>🛠️ Full App: <strong>Building Now...</strong></p>
        </div>

        <p>
            <span class="emoji">🎉</span>
            Your KidQueue application is being built with Firebase!
            <span class="emoji">🎉</span>
        </p>
    </div>

    <script>
        console.log('🔥 KidQueue Demo - Firebase Project: kidqueue-app');
        console.log('🚀 Full application coming soon!');
    </script>
</body>
</html>`;

try {
    // Create dist directory
    const distPath = path.join(__dirname, 'packages', 'web', 'dist');
    if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
    }

    // Write demo HTML
    fs.writeFileSync(path.join(distPath, 'index.html'), demoHTML);
    console.log('✅ Demo app created');

    // Deploy to Firebase
    console.log('🚀 Deploying to Firebase...');
    execSync('firebase deploy --only hosting', { stdio: 'inherit' });

    console.log('\n🎉 SUCCESS! Your app is live!');
    console.log('🌐 URL: https://kidqueue-app.web.app');
    console.log('🌐 URL: https://kidqueue-app.firebaseapp.com');

} catch (error) {
    console.error('❌ Deployment failed:', error.message);
}