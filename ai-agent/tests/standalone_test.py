"""
Standalone Insurance Agent for Local Testing
This version includes mock flight data for testing without connecting to external agents
"""

from uagents import Agent, Context, Model, Protocol, Bureau
from datetime import datetime, timedelta
import random


# Define message models
class FlightDetailsRequest(Model):
    """Request model for flight details"""
    flight_number: str


class InsuranceRecommendation(Model):
    """Insurance recommendation model"""
    flight_number: str
    recommended_insurance: str  # "cancellation" or "delay"
    confidence_score: float
    reasoning: str
    risk_factors: list[str]
    estimated_premium: float


# Initialize the insurance recommendation agent
insurance_agent = Agent(
    name="TravelSure-Insurance-Advisor-Local",
    seed="insurance_advisor_test_seed",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"]
)

# Create protocol
insurance_protocol = Protocol("InsuranceRecommendation")


# Mock flight database for testing
MOCK_FLIGHTS = {
    "AA123": {
        "airline": "American Airlines",
        "origin": "JFK",
        "destination": "LAX",
        "departure_time": (datetime.now() + timedelta(days=5, hours=8)).isoformat(),
        "status": "scheduled"
    },
    "DL456": {
        "airline": "Delta",
        "origin": "ATL",
        "destination": "SEA",
        "departure_time": (datetime.now() + timedelta(days=3, hours=18)).isoformat(),
        "status": "delayed"
    },
    "UA789": {
        "airline": "United",
        "origin": "ORD",
        "destination": "SFO",
        "departure_time": (datetime.now() + timedelta(days=7, hours=6)).isoformat(),
        "status": "scheduled"
    },
    "F9100": {
        "airline": "Frontier",
        "origin": "DEN",
        "destination": "LAS",
        "departure_time": (datetime.now() + timedelta(days=2, hours=20)).isoformat(),
        "status": "scheduled"
    },
    "NK200": {
        "airline": "Spirit Airlines",
        "origin": "FLL",
        "destination": "BOS",
        "departure_time": (datetime.now() + timedelta(days=10, hours=5)).isoformat(),
        "status": "scheduled"
    }
}


def analyze_flight_risk(flight_data: dict) -> dict:
    """Analyze flight data and determine insurance recommendation"""
    risk_factors = []
    delay_score = 0
    cancellation_score = 0
    
    # Analyze airline reliability
    airline = flight_data.get('airline', '').lower()
    budget_airlines = ['spirit', 'frontier', 'ryanair', 'allegiant']
    
    if any(budget in airline for budget in budget_airlines):
        delay_score += 30
        risk_factors.append("Budget airline with higher delay rates")
    
    # Analyze flight status
    status = flight_data.get('status', '').lower()
    if 'delay' in status:
        delay_score += 40
        risk_factors.append("Current flight status shows delays")
    elif 'cancel' in status:
        cancellation_score += 50
        risk_factors.append("Flight has cancellation history")
    
    # Analyze departure time
    try:
        dep_time = datetime.fromisoformat(flight_data.get('departure_time', ''))
        hour = dep_time.hour
        
        if 5 <= hour <= 8:
            delay_score -= 10
            risk_factors.append("Early morning departure (lower delay risk)")
        elif 17 <= hour <= 21:
            delay_score += 15
            risk_factors.append("Evening departure (higher delay risk)")
            
        # Analyze season
        month = dep_time.month
        if month in [12, 1, 2]:
            delay_score += 20
            cancellation_score += 15
            risk_factors.append("Winter season - weather-related risks")
        elif month in [6, 7, 8]:
            delay_score += 10
            risk_factors.append("Summer season - potential thunderstorms")
    except:
        pass
    
    # Determine recommendation
    if cancellation_score > delay_score:
        recommendation = "cancellation"
        confidence = min(cancellation_score / 100, 0.95)
        reasoning = "Flight analysis suggests higher cancellation risk. Cancellation insurance recommended."
    else:
        recommendation = "delay"
        confidence = min(delay_score / 100, 0.95)
        reasoning = "Flight analysis suggests higher delay risk. Delay insurance recommended."
    
    # Calculate estimated premium
    base_premium = 25.0
    risk_multiplier = 1 + (max(delay_score, cancellation_score) / 100)
    estimated_premium = round(base_premium * risk_multiplier, 2)
    
    return {
        "recommendation": recommendation,
        "confidence": confidence,
        "reasoning": reasoning,
        "risk_factors": risk_factors,
        "estimated_premium": estimated_premium
    }


@insurance_protocol.on_message(model=FlightDetailsRequest, replies={InsuranceRecommendation})
async def handle_insurance_request(ctx: Context, sender: str, msg: FlightDetailsRequest):
    """Handle incoming insurance recommendation requests"""
    ctx.logger.info(f"Received insurance request for flight: {msg.flight_number}")
    
    try:
        # Get mock flight data
        flight_data = MOCK_FLIGHTS.get(msg.flight_number.upper())
        
        if not flight_data:
            # Generate random data if flight not found
            ctx.logger.warning(f"Flight {msg.flight_number} not found in database, using defaults")
            flight_data = {
                "airline": "Unknown Airline",
                "origin": "UNKNOWN",
                "destination": "UNKNOWN",
                "departure_time": datetime.now().isoformat(),
                "status": "scheduled"
            }
        
        # Analyze and get recommendation
        analysis = analyze_flight_risk(flight_data)
        
        # Create recommendation message
        recommendation = InsuranceRecommendation(
            flight_number=msg.flight_number.upper(),
            recommended_insurance=analysis['recommendation'],
            confidence_score=analysis['confidence'],
            reasoning=analysis['reasoning'],
            risk_factors=analysis['risk_factors'],
            estimated_premium=analysis['estimated_premium']
        )
        
        # Send recommendation
        await ctx.send(sender, recommendation)
        ctx.logger.info(f"Sent insurance recommendation for {msg.flight_number}")
        
    except Exception as e:
        ctx.logger.error(f"Error processing insurance request: {e}")


# Include the protocol
insurance_agent.include(insurance_protocol, publish_manifest=True)


# Test client agent
test_client = Agent(
    name="test-client",
    seed="test_client_seed",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"]
)


@test_client.on_interval(period=10.0)
async def test_insurance_request(ctx: Context):
    """Periodically send test requests"""
    test_flights = list(MOCK_FLIGHTS.keys())
    
    test_count = int(ctx.storage.get("test_count") or 0)
    flight_number = test_flights[test_count % len(test_flights)]
    
    ctx.logger.info(f"\n{'='*70}")
    ctx.logger.info(f"Testing flight: {flight_number}")
    ctx.logger.info(f"{'='*70}")
    
    await ctx.send(insurance_agent.address, FlightDetailsRequest(flight_number=flight_number))
    ctx.storage.set("test_count", test_count + 1)


@test_client.on_message(model=InsuranceRecommendation)
async def handle_recommendation(ctx: Context, sender: str, msg: InsuranceRecommendation):
    """Handle insurance recommendations"""
    ctx.logger.info("\n" + "="*70)
    ctx.logger.info("INSURANCE RECOMMENDATION RECEIVED")
    ctx.logger.info("="*70)
    ctx.logger.info(f"Flight Number: {msg.flight_number}")
    ctx.logger.info(f"Recommended Insurance: {msg.recommended_insurance.upper()}")
    ctx.logger.info(f"Confidence Score: {msg.confidence_score:.2%}")
    ctx.logger.info(f"Estimated Premium: ${msg.estimated_premium}")
    ctx.logger.info(f"\nReasoning: {msg.reasoning}")
    ctx.logger.info(f"\nRisk Factors:")
    for i, factor in enumerate(msg.risk_factors, 1):
        ctx.logger.info(f"  {i}. {factor}")
    ctx.logger.info("="*70 + "\n")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("TravelSure Insurance Agent - Standalone Test Mode")
    print("="*80)
    print(f"Insurance Agent Address: {insurance_agent.address}")
    print(f"Test Client Address: {test_client.address}")
    print("\nAvailable test flights:")
    for flight_num, data in MOCK_FLIGHTS.items():
        print(f"  • {flight_num} - {data['airline']} ({data['origin']} → {data['destination']})")
    print("\nStarting agents... Test requests will be sent every 10 seconds")
    print("Press Ctrl+C to stop")
    print("="*80 + "\n")
    
    bureau = Bureau()
    bureau.add(insurance_agent)
    bureau.add(test_client)
    
    bureau.run()
