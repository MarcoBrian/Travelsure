"""
Deploy Updated Insurance Agent to Agentverse
"""

import requests
import json
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

API_TOKEN = os.getenv('AGENTVERSE_API_TOKEN')
AGENT_ADDRESS = "agent1qwkf3g8u75l6ycw2zjykmxewr546r5hu8vcqdzkyzs37la3kxc73jcs4avv"

headers = {
    'Authorization': f'Bearer {API_TOKEN}',
    'Content-Type': 'application/json'
}

print("="*70)
print("Updating TravelSure Insurance Advisor Agent")
print("="*70)
print(f"Agent Address: {AGENT_ADDRESS}")

# Step 1: Stop agent
print('\n🛑 Stopping agent...')
stop_resp = requests.post(
    f'https://agentverse.ai/v1/hosting/agents/{AGENT_ADDRESS}/stop',
    headers=headers,
    timeout=30
)
print(f"   Status: {stop_resp.status_code}")

# Step 2: Read and prepare code
print('\n📦 Reading updated agent code...')
with open('insurance_agent_chat.py', 'r') as f:
    code = f.read()

print(f"   Code Size: {len(code)} bytes")
print(f"   Lines: {code.count(chr(10)) + 1}")

# Format exactly like the original deploy script
code_files = [{'language': 'python', 'name': 'agent.py', 'value': code}]
code_json = json.dumps(code_files)
payload = json.dumps({'code': code_json})

# Step 3: Upload code
print('\n📤 Uploading code...')
response = requests.put(
    f'https://agentverse.ai/v1/hosting/agents/{AGENT_ADDRESS}/code',
    data=payload,
    headers=headers,
    timeout=30
)

if response.status_code == 200:
    print('✅ Code uploaded successfully!')
    
    # Step 4: Start agent
    print('\n🔄 Starting agent...')
    start_resp = requests.post(
        f'https://agentverse.ai/v1/hosting/agents/{AGENT_ADDRESS}/start',
        headers=headers,
        timeout=30
    )
    
    if start_resp.status_code == 200:
        print('✅ Agent started successfully!')
        print('\n' + "="*70)
        print("DEPLOYMENT SUCCESSFUL! 🎉")
        print("="*70)
        print(f'\n🌐 Dashboard: https://agentverse.ai/agents/{AGENT_ADDRESS}')
        print('\n📋 Agent Features:')
        print('  ✅ Uses Flight Historical Agent (agent1q2zezue4jw024...)')
        print('  ✅ Real-time + historical data (76+ flights)')
        print('  ✅ Risk assessment (LOW/MEDIUM/HIGH)')
        print('  ✅ Comprehensive analysis')
        print('  ✅ On-time %, delays, cancellations')
        print('\n🧪 Test Commands:')
        print('  1. "Check flight AA100 on 2025-10-25"')
        print('  2. "What about flight UA456 tomorrow?"')
        print('  3. "Analyze Delta 789 for next week"')
        print('\n' + "="*70)
    else:
        print(f'❌ Start failed: {start_resp.status_code}')
        print(f'   Response: {start_resp.text}')
else:
    print(f'❌ Upload failed: {response.status_code}')
    print(f'   Response: {response.text}')
    print('\n⚠️  Manual deployment required:')
    print('   1. Go to https://agentverse.ai/agents')
    print(f'   2. Find agent: {AGENT_ADDRESS}')
    print('   3. Click "Code" tab')
    print('   4. Copy code from insurance_agent_chat.py')
    print('   5. Paste and save')
