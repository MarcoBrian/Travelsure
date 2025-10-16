"""
Test script to verify agent communication
Run this locally to test if agents can communicate
"""

from uagents import Agent, Context, Model, Bureau
import asyncio

# Define message models (must match exactly)
class FlightDetailsRequest(Model):
    """Request model for flight details"""
    flight_number: str


class FlightDetailsResponse(Model):
    """Response model from flight agent"""
    flight_number: str
    departure_time: str
    arrival_time: str
    airline: str
    origin: str
    destination: str
    status: str


# Create test agents
flight_agent = Agent(
    name="test-flight-agent",
    seed="test_flight_seed_123",
    port=8001,
    endpoint=["http://localhost:8001/submit"]
)

insurance_agent = Agent(
    name="test-insurance-agent",
    seed="test_insurance_seed_456",
    port=8002,
    endpoint=["http://localhost:8002/submit"]
)


@insurance_agent.on_event("startup")
async def send_request(ctx: Context):
    """Send a test request on startup"""
    await asyncio.sleep(2)  # Wait for both agents to be ready
    ctx.logger.info(f"Sending flight request to {flight_agent.address}")
    await ctx.send(
        flight_agent.address,
        FlightDetailsRequest(flight_number="AA123")
    )


@flight_agent.on_message(model=FlightDetailsRequest, replies={FlightDetailsResponse})
async def handle_request(ctx: Context, sender: str, msg: FlightDetailsRequest):
    """Handle flight request"""
    ctx.logger.info(f"✅ Received flight request from {sender} for {msg.flight_number}")
    
    # Send mock response
    response = FlightDetailsResponse(
        flight_number=msg.flight_number,
        departure_time="2025-10-17T06:30:00",
        arrival_time="2025-10-17T14:45:00",
        airline="American Airlines",
        origin="DFW",
        destination="LHR",
        status="On Time"
    )
    
    ctx.logger.info(f"Sending response back to {sender}")
    await ctx.send(sender, response)


@insurance_agent.on_message(model=FlightDetailsResponse, replies=set())
async def handle_response(ctx: Context, sender: str, msg: FlightDetailsResponse):
    """Handle flight response"""
    ctx.logger.info(f"✅ Received flight details from {sender}")
    ctx.logger.info(f"   Flight: {msg.flight_number}")
    ctx.logger.info(f"   Airline: {msg.airline}")
    ctx.logger.info(f"   Status: {msg.status}")
    ctx.logger.info("✅ TEST PASSED - Agents can communicate!")


# Run both agents in a bureau
bureau = Bureau()
bureau.add(flight_agent)
bureau.add(insurance_agent)

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Agent Communication")
    print("=" * 60)
    print(f"Flight Agent: {flight_agent.address}")
    print(f"Insurance Agent: {insurance_agent.address}")
    print("=" * 60)
    print("\nStarting agents...")
    print("Watch for '✅ TEST PASSED' message")
    print("=" * 60)
    bureau.run()
