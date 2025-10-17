# Flight Data Agents for TravelSure

This directory contains three specialized agents that fetch and analyze flight data from the FlightDelay API for use in the TravelSure insurance platform.

## Agents Overview

### 1. Flight Schedule Agent (`flight_schedule_agent.py`)

**API**: `https://flightdelay.app/api/flightstats/schedule/{airline}/{flightNumber}/{date}`

Fetches real-time flight schedules including:

- Departure and arrival times
- Airport information (city, coordinates, terminals)
- Flight equipment details
- Multi-leg route information

**Use Case**: Getting specific flight details for a particular date.

### 2. Flight Quote Agent (`flight_quote_agent.py`)

**API**: `https://flightdelay.app/api/quote/{airline}/{flightNumber}`

Fetches historical performance and pricing data:

- Insurance premium calculations
- Historical on-time performance percentage
- Payout amounts (delayed, cancelled, diverted)
- Historical statistics from past flights

**Use Case**: Risk assessment and pricing for insurance policies.

### 3. Flight Historical Agent (`flight_historical_agent.py`)

**APIs**: Combines both Schedule + Quote APIs

Provides comprehensive flight analysis:

- Complete flight information (route, times, airports)
- Risk assessment (LOW/MEDIUM/HIGH)
- Risk score calculation (0.0 to 1.0)
- Insurance recommendations
- Detailed historical performance analysis

**Use Case**: Primary agent for the insurance recommendation system. Provides all data needed for informed decisions.

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/ansh/Documents/hackathons/travelsure-eth-global/Travelsure/ai-agent
pip install -r requirements.txt
```

### 2. Set Up Environment

Create/update `.env` file in parent directory:

```bash
AGENTVERSE_API_TOKEN=your_token_here
```

Get your token from: https://agentverse.ai/profile/api-keys

### 3. Test Agents Locally

```bash
cd flight-data-agent
python test_agents.py
```

This will test all three agents with sample flight data and verify they work correctly.

### 4. Deploy to Agentverse

```bash
python deploy_all_agents.py
```

This will:

- Deploy or update all three agents
- Provide agent addresses
- Start the agents automatically

### 5. Get Agent Addresses

After deployment, visit https://agentverse.ai/agents to get the agent addresses. You'll need these for integrating with the insurance agent.

## Message Protocols

### Schedule Agent

**Request**: `FlightScheduleRequest`

```python
{
    "airline": "AA",           # IATA code
    "flight_number": "100",    # Flight number
    "date": "2025-10-20"       # YYYY-MM-DD
}
```

**Response**: `FlightScheduleResponse`

```python
{
    "success": True,
    "airline": "AA",
    "flight_number": "100",
    "date": "2025-10-20",
    "scheduled_flights": [...],  # Array of flight details
    "airports": [...],           # Array of airport info
    "error": None
}
```

### Quote Agent

**Request**: `FlightQuoteRequest`

```python
{
    "airline": "AA",           # IATA code
    "flight_number": "100"     # Flight number
}
```

**Response**: `FlightQuoteResponse`

```python
{
    "success": True,
    "airline": "AA",
    "flight_number": "100",
    "premium": 12.50,
    "payout_delayed": 50.00,
    "payout_cancelled": 100.00,
    "payout_diverted": 75.00,
    "ontime_percent": 0.85,
    "stat_ontime": 170,
    "stat_delayed": 25,
    "stat_cancelled": 3,
    "stat_diverted": 2,
    "total_flights": 200,
    "error": None
}
```

### Historical Agent

**Request**: `FlightHistoricalRequest`

```python
{
    "airline": "AA",
    "flight_number": "100",
    "date": "2025-10-20"
}
```

**Response**: `FlightHistoricalResponse`

```python
{
    "success": True,
    "airline": "AA",
    "flight_number": "100",
    "date": "2025-10-20",

    # Route info
    "departure_time": "2025-10-20T08:00:00",
    "arrival_time": "2025-10-20T12:00:00",
    "origin_city": "New York",
    "origin_iata": "JFK",
    "destination_city": "London",
    "destination_iata": "LHR",

    # Risk assessment
    "ontime_percent": 0.85,
    "delay_risk": "LOW",         # LOW/MEDIUM/HIGH
    "risk_score": 0.15,          # 0.0 to 1.0
    "recommendation": "Excellent on-time performance. Low risk flight.",

    # Statistics
    "total_historical_flights": 200,
    "ontime_count": 170,
    "delayed_count": 25,
    "cancelled_count": 3,
    "diverted_count": 2,

    # Pricing
    "suggested_premium": 12.50,

    "error": None
}
```

## Integration with Insurance Agent

The Historical Agent is the recommended agent for insurance recommendations. Here's how to integrate:

```python
from uagents import Agent, Context, Model

# Import the request/response models
from flight_historical_agent import FlightHistoricalRequest, FlightHistoricalResponse

# Your insurance agent
insurance_agent = Agent(name="insurance", ...)

# Historical agent address (get from Agentverse after deployment)
HISTORICAL_AGENT_ADDRESS = "agent1q..."

@insurance_agent.on_message(model=FlightHistoricalResponse)
async def handle_flight_data(ctx: Context, sender: str, msg: FlightHistoricalResponse):
    if msg.success:
        # Use the data for insurance recommendation
        ctx.logger.info(f"Risk Level: {msg.delay_risk}")
        ctx.logger.info(f"On-time: {msg.ontime_percent * 100:.1f}%")
        ctx.logger.info(f"Suggested Premium: ${msg.suggested_premium}")

        # Make insurance decision based on risk_score
        if msg.risk_score > 0.3:
            ctx.logger.info("⚠️ High risk - recommend insurance")
        else:
            ctx.logger.info("✅ Low risk - optional insurance")
    else:
        ctx.logger.error(f"Error: {msg.error}")

# Request flight data
async def get_flight_data(ctx: Context, airline: str, flight_num: str, date: str):
    await ctx.send(
        HISTORICAL_AGENT_ADDRESS,
        FlightHistoricalRequest(
            airline=airline,
            flight_number=flight_num,
            date=date
        )
    )
```

## Testing

### Test Individual Agents

Run each agent locally:

```bash
python flight_schedule_agent.py
python flight_quote_agent.py
python flight_historical_agent.py
```

### Test with Real Flight Data

Modify `test_agents.py` to test with different flights:

```python
airline = "BA"          # Try: AA, BA, UA, DL
flight_number = "001"   # Popular flights: 001, 100, 1
date = "2025-10-20"     # Future date
```

### Common Test Flights

- **AA100**: American Airlines (US domestic)
- **BA001**: British Airways (transatlantic)
- **UA1**: United Airlines
- **DL1**: Delta Air Lines

## Troubleshooting

### API Rate Limits

The FlightDelay API may rate-limit requests. If you see errors:

- Wait a few minutes between tests
- Use different flight numbers
- Check API status at https://flightdelay.app

### Flight Not Found

- Ensure flight number exists (try popular routes)
- Check date format (YYYY-MM-DD)
- Try major airline codes (AA, BA, UA, DL)

### Deployment Issues

- Verify AGENTVERSE_API_TOKEN is set
- Check internet connectivity
- Ensure you have Agentverse account
- Try deploying one agent at a time

### Network Timeouts

- APIs have 15-second timeout
- Check your internet connection
- Try testing with a VPN if blocked

## Files

- `flight_schedule_agent.py` - Schedule data agent
- `flight_quote_agent.py` - Quote and statistics agent
- `flight_historical_agent.py` - Comprehensive analysis agent
- `deploy_all_agents.py` - Deployment script
- `test_agents.py` - Test suite
- `README.md` - This file

## Architecture

```
┌─────────────────────┐
│  Insurance Agent    │
└──────────┬──────────┘
           │
           │ requests flight data
           │
           ▼
┌─────────────────────┐
│ Historical Agent    │
└──────────┬──────────┘
           │
           ├──────────┐
           │          │
           ▼          ▼
┌──────────────┐  ┌──────────────┐
│Schedule API  │  │  Quote API   │
└──────────────┘  └──────────────┘
FlightDelay.app   FlightDelay.app
```

## Next Steps

1. ✅ Test agents locally
2. ✅ Deploy to Agentverse
3. 📝 Note agent addresses
4. 🔗 Integrate with insurance agent
5. 🎯 Update frontend to use agent data

## Support

- Fetch.ai Docs: https://fetch.ai/docs
- Agentverse: https://agentverse.ai
- uAgents GitHub: https://github.com/fetchai/uAgents

## License

MIT
