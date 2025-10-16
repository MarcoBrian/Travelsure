"""
Example client to interact with a deployed Agentverse agent
Use this after deploying your agent to test it
"""

from uagents import Agent, Context, Model
import sys


class FlightDetailsRequest(Model):
    """Request model for flight details"""
    flight_number: str


class InsuranceRecommendation(Model):
    """Insurance recommendation model"""
    flight_number: str
    recommended_insurance: str
    confidence_score: float
    reasoning: str
    risk_factors: list[str]
    estimated_premium: float


def create_test_client(insurance_agent_address: str, flight_number: str):
    """
    Create a test client to communicate with deployed agent
    
    Args:
        insurance_agent_address: The address of your deployed insurance agent
        flight_number: The flight number to test
    """
    
    # Create a local agent with mailbox to communicate with Agentverse
    client = Agent(
        name="insurance-test-client",
        seed="test_client_seed_phrase_change_this",
        mailbox=True,  # Enable mailbox for Agentverse communication
    )
    
    print(f"\nTest Client Address: {client.address}")
    print(f"Target Agent: {insurance_agent_address}")
    print(f"Testing Flight: {flight_number}\n")
    
    @client.on_interval(period=5.0, messages=FlightDetailsRequest)
    async def send_request(ctx: Context):
        """Send test request"""
        ctx.logger.info(f"Sending request for flight {flight_number}...")
        await ctx.send(
            insurance_agent_address,
            FlightDetailsRequest(flight_number=flight_number)
        )
    
    @client.on_message(model=InsuranceRecommendation)
    async def handle_response(ctx: Context, sender: str, msg: InsuranceRecommendation):
        """Handle recommendation response"""
        print("\n" + "="*80)
        print("✓ INSURANCE RECOMMENDATION RECEIVED")
        print("="*80)
        print(f"Flight Number: {msg.flight_number}")
        print(f"Recommended Insurance Type: {msg.recommended_insurance.upper()}")
        print(f"Confidence Score: {msg.confidence_score:.1%}")
        print(f"Estimated Premium: ${msg.estimated_premium:.2f}")
        print(f"\nReasoning:")
        print(f"  {msg.reasoning}")
        print(f"\nRisk Factors Identified:")
        for i, factor in enumerate(msg.risk_factors, 1):
            print(f"  {i}. {factor}")
        print("="*80 + "\n")
        
        # Stop after receiving response
        ctx.logger.info("Test completed successfully!")
    
    return client


def main():
    """Main function"""
    print("\n" + "="*80)
    print("TravelSure Insurance Agent - Agentverse Test Client")
    print("="*80)
    
    # Get agent address from command line or prompt
    if len(sys.argv) > 1:
        agent_address = sys.argv[1]
    else:
        agent_address = input("\nEnter your deployed agent address: ").strip()
    
    if not agent_address:
        print("Error: Agent address is required!")
        print("\nUsage: python agentverse_test.py <agent_address> [flight_number]")
        sys.exit(1)
    
    # Get flight number from command line or use default
    if len(sys.argv) > 2:
        flight_number = sys.argv[2]
    else:
        flight_number = input("Enter flight number to test (or press Enter for AA123): ").strip()
        if not flight_number:
            flight_number = "AA123"
    
    print(f"\nConnecting to agent: {agent_address}")
    print(f"Testing with flight: {flight_number}")
    print("\nStarting test client...")
    print("This will send a request and wait for a response.")
    print("Press Ctrl+C to stop\n")
    
    # Create and run client
    client = create_test_client(agent_address, flight_number)
    client.run()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest stopped by user.")
    except Exception as e:
        print(f"\nError: {e}")
        print("\nMake sure you:")
        print("1. Have deployed your agent to Agentverse")
        print("2. Are using the correct agent address")
        print("3. Have installed dependencies: pip install uagents")
