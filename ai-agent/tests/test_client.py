"""
Test client for the Insurance Recommendation Agent
This script simulates a user requesting insurance recommendations
"""

from uagents import Agent, Context, Model, Bureau
from insurance_agent import FlightDetailsRequest, InsuranceRecommendation, insurance_agent


# Create a test client agent
test_client = Agent(
    name="test-client",
    seed="test_client_seed_phrase",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"]
)

# Store the insurance agent's address
INSURANCE_AGENT_ADDRESS = insurance_agent.address


@test_client.on_interval(period=15.0)
async def test_insurance_request(ctx: Context):
    """
    Periodically send test flight numbers to the insurance agent
    """
    test_flights = [
        "AA123",    # American Airlines
        "DL456",    # Delta
        "UA789",    # United
        "F9100",    # Frontier (budget)
        "NK200"     # Spirit (budget)
    ]
    
    # Get a flight to test (cycle through them)
    test_count = int(ctx.storage.get("test_count") or 0)
    flight_number = test_flights[test_count % len(test_flights)]
    
    ctx.logger.info(f"Requesting insurance recommendation for flight: {flight_number}")
    
    # Send request to insurance agent
    await ctx.send(
        INSURANCE_AGENT_ADDRESS,
        FlightDetailsRequest(flight_number=flight_number)
    )
    
    # Increment test counter
    ctx.storage.set("test_count", test_count + 1)


@test_client.on_message(model=InsuranceRecommendation)
async def handle_recommendation(ctx: Context, sender: str, msg: InsuranceRecommendation):
    """
    Handle insurance recommendations from the agent
    """
    ctx.logger.info("=" * 70)
    ctx.logger.info("INSURANCE RECOMMENDATION RECEIVED")
    ctx.logger.info("=" * 70)
    ctx.logger.info(f"Flight Number: {msg.flight_number}")
    ctx.logger.info(f"Recommended Insurance: {msg.recommended_insurance.upper()}")
    ctx.logger.info(f"Confidence Score: {msg.confidence_score:.2%}")
    ctx.logger.info(f"Estimated Premium: ${msg.estimated_premium}")
    ctx.logger.info(f"\nReasoning: {msg.reasoning}")
    ctx.logger.info(f"\nRisk Factors:")
    for i, factor in enumerate(msg.risk_factors, 1):
        ctx.logger.info(f"  {i}. {factor}")
    ctx.logger.info("=" * 70)


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("TravelSure Insurance Agent - Test Client")
    print("=" * 70)
    print(f"Test Client Address: {test_client.address}")
    print(f"Insurance Agent Address: {INSURANCE_AGENT_ADDRESS}")
    print("\nStarting test client...")
    print("The client will send test flight numbers every 15 seconds")
    print("Press Ctrl+C to stop")
    print("=" * 70 + "\n")
    
    # Create a bureau to run both agents together
    bureau = Bureau()
    bureau.add(insurance_agent)
    bureau.add(test_client)
    
    bureau.run()
