"""
Flight Data Agent for TravelSure
This agent fetches flight details from FlightDelay API and responds to insurance agent requests.
"""

from uagents import Agent, Context, Model, Protocol
import aiohttp
import asyncio
from typing import Optional
import re
from datetime import datetime

# Define message models (must match insurance agent)
class FlightDetailsRequest(Model):
    """Request model for flight details"""
    flight_number: str


class FlightDetailsResponse(Model):
    """Response model with flight details"""
    flight_number: str
    departure_time: str
    arrival_time: str
    airline: str
    origin: str
    destination: str
    status: str


# FlightDelay API Configuration
FLIGHT_API_BASE_URL = "https://flightdelay.app/api/quote"

# Initialize the flight data agent
flight_agent = Agent(
    name="TravelSure-Flight-Data",
    seed="flight_data_secure_seed_phrase_change_this",
    mailbox=True,
)

# Create protocol
flight_protocol = Protocol("FlightData")


def parse_flight_number(flight_number: str) -> tuple[Optional[str], Optional[str]]:
    """
    Extract airline code and flight number from flight string
    
    Args:
        flight_number: e.g., "AA123", "BA456"
        
    Returns:
        Tuple of (airline_code, flight_num) or (None, None)
    """
    # Remove spaces and uppercase
    flight_number = flight_number.replace(" ", "").upper()
    
    # Match pattern: 2-3 letters followed by 1-4 digits
    match = re.match(r'^([A-Z]{2,3})(\d{1,4})$', flight_number)
    
    if match:
        return match.group(1), match.group(2)
    return None, None


async def fetch_flight_data(flight_number: str) -> Optional[dict]:
    """
    Fetch flight data from FlightDelay API
    
    Args:
        flight_number: Flight number to look up (e.g., "AA123")
        
    Returns:
        Dictionary with flight data or None if not found
    """
    try:
        # Parse flight number into airline code and number
        airline_code, flight_num = parse_flight_number(flight_number)
        
        if not airline_code or not flight_num:
            print(f"Invalid flight number format: {flight_number}")
            return None
        
        async with aiohttp.ClientSession() as session:
            # FlightDelay API endpoint: /api/quote/{airline}/{flightNumber}
            url = f"{FLIGHT_API_BASE_URL}/{airline_code}/{flight_num}"
            
            print(f"Fetching from: {url}")
            
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Transform FlightDelay API response to our format
                    # Extract relevant fields from the API response
                    flight_info = {
                        'flight_number': flight_number,
                        'departure_time': data.get('departureTime', datetime.now().isoformat()),
                        'arrival_time': data.get('arrivalTime', datetime.now().isoformat()),
                        'airline': data.get('airlineName', airline_code),
                        'origin': data.get('origin', 'UNK'),
                        'destination': data.get('destination', 'UNK'),
                        'status': data.get('status', 'On Time')
                    }
                    
                    return flight_info
                    
                elif response.status == 404:
                    print(f"Flight {flight_number} not found in API")
                    return None
                else:
                    print(f"API returned status {response.status}")
                    error_text = await response.text()
                    print(f"Error: {error_text}")
                    return None
                    
    except asyncio.TimeoutError:
        print(f"Timeout fetching flight data for {flight_number}")
        return None
    except Exception as e:
        print(f"Error fetching flight data: {e}")
        return None


@flight_protocol.on_message(model=FlightDetailsRequest, replies={FlightDetailsResponse})
async def handle_flight_request(ctx: Context, sender: str, msg: FlightDetailsRequest):
    """Handle flight details requests"""
    ctx.logger.info(f"Received flight request for: {msg.flight_number} from {sender}")
    
    try:
        # Fetch flight data from API
        flight_data = await fetch_flight_data(msg.flight_number)
        
        if flight_data:
            # Create response with the fetched data
            response = FlightDetailsResponse(
                flight_number=flight_data['flight_number'],
                departure_time=flight_data['departure_time'],
                arrival_time=flight_data['arrival_time'],
                airline=flight_data['airline'],
                origin=flight_data['origin'],
                destination=flight_data['destination'],
                status=flight_data['status']
            )
            
            ctx.logger.info(f"Sending flight details for {msg.flight_number} to {sender}")
            await ctx.send(sender, response)
            
        else:
            # Flight not found - send a default response
            ctx.logger.warning(f"Flight {msg.flight_number} not found in API")
            
            response = FlightDetailsResponse(
                flight_number=msg.flight_number,
                departure_time="2025-10-17T12:00:00Z",
                arrival_time="2025-10-17T15:00:00Z",
                airline="Unknown",
                origin="UNK",
                destination="UNK",
                status="Not Found"
            )
            
            await ctx.send(sender, response)
            
    except Exception as e:
        ctx.logger.error(f"Error processing flight request: {e}")
        
        # Send error response
        response = FlightDetailsResponse(
            flight_number=msg.flight_number,
            departure_time="2025-10-17T12:00:00Z",
            arrival_time="2025-10-17T15:00:00Z",
            airline="Error",
            origin="ERR",
            destination="ERR",
            status="Error fetching data"
        )
        
        await ctx.send(sender, response)


@flight_agent.on_interval(period=60.0)
async def log_status(ctx: Context):
    """Periodic status logging"""
    ctx.logger.info("TravelSure Flight Data Agent is running...")
    ctx.logger.info(f"Agent Address: {flight_agent.address}")
    ctx.logger.info(f"API URL: {FLIGHT_API_BASE_URL}")


# Include protocol
flight_agent.include(flight_protocol, publish_manifest=True)

# Print agent information
print(f"TravelSure Flight Data Agent")
print(f"Agent Address: {flight_agent.address}")
print(f"API Base URL: {FLIGHT_API_BASE_URL}")
print(f"\nThis agent fetches flight data from FlightDelay API")
print(f"Format: {FLIGHT_API_BASE_URL}/{{airline}}/{{flightNumber}}")

if __name__ == "__main__":
    flight_agent.run()
