import requests
import json
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

API_TOKEN = os.getenv('AGENTVERSE_API_TOKEN')
# Use the insurance agent address, not flight agent
AGENT_ADDRESS = "agent1qwkf3g8u75l6ycw2zjykmxewr546r5hu8vcqdzkyzs37la3kxc73jcs4avv"

headers = {
    'Authorization': f'Bearer {API_TOKEN}',
    'Content-Type': 'application/json'
}

print('🛑 Stopping agent...')
requests.post(f'https://agentverse.ai/v1/hosting/agents/{AGENT_ADDRESS}/stop', headers=headers, timeout=30)

print('📦 Reading agent code...')
with open('insurance_agent_chat.py', 'r') as f:
    code = f.read()

code_files = [{'language': 'python', 'name': 'agent.py', 'value': code}]
code_json = json.dumps(code_files)
payload = json.dumps({'code': code_json})

print('📤 Uploading code...')
response = requests.put(f'https://agentverse.ai/v1/hosting/agents/{AGENT_ADDRESS}/code', data=payload, headers=headers, timeout=30)

if response.status_code == 200:
    print('✅ Code uploaded!')
    print('🔄 Starting agent...')
    start_resp = requests.post(f'https://agentverse.ai/v1/hosting/agents/{AGENT_ADDRESS}/start', headers=headers, timeout=30)
    if start_resp.status_code == 200:
        print('✅ Agent started with chat protocol!')
        print(f'🌐 Dashboard: https://agentverse.ai/agents/{AGENT_ADDRESS}')
    else:
        print(f'❌ Start failed: {start_resp.status_code} - {start_resp.text}')
else:
    print(f'❌ Upload failed: {response.status_code} - {response.text}')
