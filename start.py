#!/usr/bin/env python3
"""
Quiz Admin Panel - Simple Python Version
Startup script to install dependencies and run the server
"""

import subprocess
import sys
import os

def main():
    print("🎯 Quiz Admin Panel - Python Version")
    print("="*40)
    
    # Check Python version
    if sys.version_info < (3, 7):
        print("❌ Error: Python 3.7 or higher is required!")
        print(f"Current version: {sys.version}")
        return
    
    print(f"✅ Python version: {sys.version.split()[0]}")
    
    # Install requirements
    print("📦 Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements-simple.txt"])
        print("✅ Packages installed successfully!")
    except subprocess.CalledProcessError:
        print("❌ Failed to install packages!")
        return
    
    # Start server
    print("\n🚀 Starting Quiz Admin Panel Server...")
    print("📍 Server will run on: http://localhost:5000")
    print("📊 Admin panel: Open admin-panel/index.html in browser")
    print("💻 Client system: Open client-system/index.html in browser")
    print("\n" + "="*60)
    print("Press Ctrl+C to stop the server")
    print("="*60 + "\n")
    
    try:
        subprocess.run([sys.executable, "server-simple.py"])
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error running server: {e}")

if __name__ == "__main__":
    main()
