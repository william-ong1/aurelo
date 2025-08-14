#!/usr/bin/env python3
"""
Test script for Supabase integration
Run this after setting up your .env file to verify everything works
"""

import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = "http://localhost:8000"

def test_connection():
    """Test if the server is running"""
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("✅ Server is running")
            return True
        else:
            print("❌ Server is not responding correctly")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running with: python app.py")
        return False

def test_register():
    """Test user registration"""
    print("\n🔐 Testing user registration...")
    
    test_user = {
        "email": "test@example.com",
        "password": "testpassword123",
        "name": "Test User"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=test_user,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("✅ Registration successful")
            return response.json()
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return None

def test_login():
    """Test user login"""
    print("\n🔑 Testing user login...")
    
    login_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful")
            print(f"User ID: {data['user']['id']}")
            return data['access_token']
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_portfolio_operations(token):
    """Test portfolio save and retrieve operations"""
    print("\n💼 Testing portfolio operations...")
    
    # Test data
    test_portfolio = {
        "assets": [
            {
                "name": "Apple Inc.",
                "isStock": True,
                "ticker": "AAPL",
                "shares": 10.5,
                "currentPrice": 150.25,
                "balance": 0,
                "apy": 0
            },
            {
                "name": "Savings Account",
                "isStock": False,
                "ticker": None,
                "shares": 0,
                "currentPrice": 0,
                "balance": 5000.00,
                "apy": 0.045
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    # Test save portfolio
    try:
        response = requests.post(
            f"{BASE_URL}/api/portfolio/save",
            json=test_portfolio,
            headers=headers
        )
        
        if response.status_code == 200:
            print("✅ Portfolio save successful")
        else:
            print(f"❌ Portfolio save failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Portfolio save error: {e}")
        return False
    
    # Test get portfolio
    try:
        response = requests.get(
            f"{BASE_URL}/api/portfolio",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Portfolio retrieve successful - {len(data['assets'])} assets")
            for asset in data['assets']:
                print(f"  - {asset['name']}: {asset['ticker'] or f'${asset['balance']:.2f}'}")
            return True
        else:
            print(f"❌ Portfolio retrieve failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Portfolio retrieve error: {e}")
        return False

def test_unauthorized_access():
    """Test that unauthorized access is blocked"""
    print("\n🚫 Testing unauthorized access...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/portfolio")
        
        if response.status_code == 401:
            print("✅ Unauthorized access correctly blocked")
            return True
        elif response.status_code == 404:
            print("⚠️  Endpoint not found - this might be expected if Supabase is not configured")
            return True
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Unauthorized access test error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Supabase Integration for Fintra")
    print("=" * 50)
    
    # Check environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase environment variables")
        print("Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file")
        return
    
    print("✅ Environment variables found")
    
    # Run tests
    if not test_connection():
        return
    
    if not test_unauthorized_access():
        return
    
    user_data = test_register()
    if not user_data:
        print("⚠️  Registration failed - user might already exist")
    
    token = test_login()
    if not token:
        return
    
    if not test_portfolio_operations(token):
        return
    
    print("\n🎉 All tests passed! Supabase integration is working correctly.")
    print("\nNext steps:")
    print("1. Update your frontend to use the new authentication endpoints")
    print("2. Add login/register forms to your UI")
    print("3. Include the Authorization header in your API calls")

if __name__ == "__main__":
    main()
