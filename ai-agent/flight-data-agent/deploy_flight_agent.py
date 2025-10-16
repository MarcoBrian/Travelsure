"""
Deploy Flight Agent to Agentverse
"""

import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from parent directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Get API token from environment
API_TOKEN = os.getenv('AGENTVERSE_API_TOKEN')

if not API_TOKEN:
    print("❌ Error: AGENTVERSE_API_TOKEN not found in environment")
    print("Please set it in your .env file")
    exit(1)

# Read the flight agent code
flight_agent_path = Path(__file__).parent / "flight_agent.py"
with open(flight_agent_path, 'r') as f:
    agent_code = f.read()

# Agentverse API endpoint
AGENTVERSE_API = "https://agentverse.ai"

# Agent configuration
AGENT_NAME = "TravelSure Flight Data Agent"
AGENT_README = """# TravelSure Flight Data Agent

This agent fetches real-time flight information from FlightDelay API and provides it to the insurance recommendation agent.

## Features
- Fetches flight details from FlightDelay API (https://flightdelay.app)
- Parses flight numbers (e.g., AA123, BA456)
- Returns structured flight information
- Handles errors gracefully

## API Integration
Uses: https://flightdelay.app/api/quote/{airline}/{flightNumber}

## Message Protocol
Accepts `FlightDetailsRequest` with `flight_number` and returns `FlightDetailsResponse` with all flight details.
"""

def create_or_update_agent():
    """Create or update the flight agent on Agentverse"""
    
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # First, check if agent already exists
    print("🔍 Checking for existing agent...")
    response = requests.get(
        f"{AGENTVERSE_API}/v1/hosting/agents",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Error fetching agents: {response.status_code}")
        print(response.text)
        return None
    
    agents = response.json().get('items', [])
    existing_agent = None
    
    for agent in agents:
        if agent.get('name') == AGENT_NAME:
            existing_agent = agent
            break
    
    # Prepare code payload
    code_payload = [
        {
            "id": 0,
            "name": "agent.py",
            "value": agent_code,
            "language": "python"
        }
    ]
    
    if existing_agent:
        # Update existing agent
        agent_address = existing_agent['address']
        print(f"📝 Updating existing agent: {agent_address}")
        
        # Stop agent first
        print("⏸️  Stopping agent...")
        stop_response = requests.patch(
            f"{AGENTVERSE_API}/v1/hosting/agents/{agent_address}/stop",
            headers=headers
        )
        
        # Update code
        print("📤 Uploading new code...")
        update_response = requests.put(
            f"{AGENTVERSE_API}/v1/hosting/agents/{agent_address}/code",
            headers=headers,
            json={"code": json.dumps(code_payload)}
        )
        
        if update_response.status_code not in [200, 204]:
            print(f"❌ Error updating code: {update_response.status_code}")
            print(update_response.text)
            return None
        
        # Start agent
        print("▶️  Starting agent...")
        start_response = requests.patch(
            f"{AGENTVERSE_API}/v1/hosting/agents/{agent_address}/start",
            headers=headers
        )
        
        print(f"✅ Agent updated successfully!")
        print(f"Agent Address: {agent_address}")
        return agent_address
        
    else:
        # Create new agent
        print("🆕 Creating new agent...")
        
        create_payload = {
            "name": AGENT_NAME,
            "code": json.dumps(code_payload),
            "readme": AGENT_README
        }
        
        create_response = requests.post(
            f"{AGENTVERSE_API}/v1/hosting/agents",
            headers=headers,
            json=create_payload
        )
        
        if create_response.status_code not in [200, 201]:
            print(f"❌ Error creating agent: {create_response.status_code}")
            print(create_response.text)
            return None
        
        agent_data = create_response.json()
        agent_address = agent_data.get('address')
        
        print(f"✅ Agent created successfully!")
        print(f"Agent Address: {agent_address}")
        return agent_address


if __name__ == "__main__":
    print("=" * 60)
    print("TravelSure Flight Agent Deployment")
    print("=" * 60)
    
    agent_address = create_or_update_agent()
    
    if agent_address:
        print("\n" + "=" * 60)
        print("📋 Next Steps:")
        print("=" * 60)
        print(f"1. Update insurance_agent_chat.py:")
        print(f"   FLIGHT_AGENT_ADDRESS = \"{agent_address}\"")
        print(f"\n2. Update flight_agent.py:")
        print(f"   FLIGHT_API_URL = \"https://your-domain.com/api/flight-data\"")
        print(f"\n3. Deploy insurance agent with updated address")
        print("=" * 60)
    else:
        print("\n❌ Deployment failed!")
