"""
Flight Historical Data Agent for TravelSure
Combines schedule and quote data to provide comprehensive flight analysis.
This agent is used by the insurance agent to analyze flight reliability.
"""

from uagents import Agent, Context, Model, Protocol
import aiohttp
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime

# Message Models
class FlightHistoricalRequest(Model):
    """Request model for comprehensive flight data"""
    airline: str  # IATA airline code
    flight_number: str  # Flight number
    date: str  # Date in YYYY-MM-DD format


class FlightHistoricalResponse(Model):
    """Comprehensive response with schedule and statistics"""
    success: bool
    airline: str
    flight_number: str
    date: str
    
    # Schedule information
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    origin_city: Optional[str] = None
    origin_iata: Optional[str] = None
    destination_city: Optional[str] = None
    destination_iata: Optional[str] = None
    
    # Historical performance (for risk analysis)
    ontime_percent: Optional[float] = None
    delay_risk: Optional[str] = None  # "LOW", "MEDIUM", "HIGH"
    
    # Statistics
    total_historical_flights: Optional[int] = None
    ontime_count: Optional[int] = None
    delayed_count: Optional[int] = None
    cancelled_count: Optional[int] = None
    diverted_count: Optional[int] = None
    
    # Pricing reference (from quote API)
    suggested_premium: Optional[float] = None
    
    # Risk assessment
    risk_score: Optional[float] = None  # 0.0 (low) to 1.0 (high)
    recommendation: Optional[str] = None
    
    error: Optional[str] = None


# API Configuration
SCHEDULE_API = "https://flightdelay.app/api/flightstats/schedule"
QUOTE_API = "https://flightdelay.app/api/quote"

# Initialize the agent
historical_agent = Agent(
    name="TravelSure-Flight-Historical",
    seed="flight_historical_secure_seed_2024_change_this",
    mailbox=True,
)

# Create protocol
historical_protocol = Protocol("FlightHistorical")


async def fetch_comprehensive_data(airline: str, flight_number: str, date: str) -> Dict[str, Any]:
    """
    Fetch both schedule and quote data, combine for comprehensive analysis
    
    Args:
        airline: IATA airline code
        flight_number: Flight number
        date: Date in YYYY-MM-DD format
        
    Returns:
        Dictionary with combined data and analysis
    """
    try:
        airline = airline.strip().upper()
        flight_number = flight_number.strip()
        date = date.strip()
        
        # Validate date
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            return {
                "success": False,
                "error": f"Invalid date format: {date}. Expected YYYY-MM-DD"
            }
        
        schedule_url = f"{SCHEDULE_API}/{airline}/{flight_number}/{date}"
        quote_url = f"{QUOTE_API}/{airline}/{flight_number}"
        
        print(f"[Historical] Fetching schedule from: {schedule_url}")
        print(f"[Historical] Fetching quote from: {quote_url}")
        
        async with aiohttp.ClientSession() as session:
            # Fetch both APIs in parallel
            schedule_task = session.get(
                schedule_url,
                timeout=aiohttp.ClientTimeout(total=15),
                headers={'Accept': 'application/json'}
            )
            quote_task = session.get(
                quote_url,
                timeout=aiohttp.ClientTimeout(total=15),
                headers={'Accept': 'application/json'}
            )
            
            schedule_response, quote_response = await asyncio.gather(
                schedule_task, quote_task, return_exceptions=True
            )
            
            # Process schedule data
            schedule_data = None
            if not isinstance(schedule_response, Exception) and schedule_response.status == 200:
                schedule_data = await schedule_response.json()
                print("[Historical] ✅ Schedule data retrieved")
            else:
                print(f"[Historical] ⚠️ Schedule fetch failed")
            
            # Process quote data
            quote_data = None
            if not isinstance(quote_response, Exception) and quote_response.status == 200:
                quote_data = await quote_response.json()
                print("[Historical] ✅ Quote data retrieved")
            else:
                print(f"[Historical] ⚠️ Quote fetch failed")
            
            # Check if we got at least one response
            if not schedule_data and not quote_data:
                return {
                    "success": False,
                    "error": "Failed to fetch both schedule and quote data"
                }
            
            # Extract schedule information
            departure_time = None
            arrival_time = None
            origin_city = None
            origin_iata = None
            destination_city = None
            destination_iata = None
            
            if schedule_data:
                scheduled_flights = schedule_data.get('scheduledFlights', [])
                airports = schedule_data.get('appendix', {}).get('airports', [])
                
                if scheduled_flights:
                    flight = scheduled_flights[0]
                    departure_time = flight.get('departureTime')
                    arrival_time = flight.get('arrivalTime')
                    
                    # Find airport details
                    dep_code = flight.get('departureAirportFsCode')
                    arr_code = flight.get('arrivalAirportFsCode')
                    
                    for airport in airports:
                        if airport.get('fs') == dep_code:
                            origin_city = airport.get('city')
                            origin_iata = airport.get('iata')
                        if airport.get('fs') == arr_code:
                            destination_city = airport.get('city')
                            destination_iata = airport.get('iata')
            
            # Extract quote/statistics information
            ontime_percent = None
            statistics = [0, 0, 0, 0]
            suggested_premium = None
            
            if quote_data:
                ontime_percent = quote_data.get('ontimepercent', 0.0)
                statistics = quote_data.get('statistics', [0, 0, 0, 0])
                suggested_premium = quote_data.get('premium', 0.0)
                
                while len(statistics) < 4:
                    statistics.append(0)
            
            total_flights = sum(statistics)
            
            # Calculate risk assessment
            risk_score = 1.0 - ontime_percent if ontime_percent else 0.5
            
            if risk_score < 0.15:
                delay_risk = "LOW"
                recommendation = "Excellent on-time performance. Low risk flight."
            elif risk_score < 0.30:
                delay_risk = "MEDIUM"
                recommendation = "Good performance with occasional delays. Consider insurance."
            else:
                delay_risk = "HIGH"
                recommendation = "Frequent delays or disruptions. Insurance recommended."
            
            print(f"[Historical] Analysis complete - Risk: {delay_risk}, On-time: {ontime_percent*100 if ontime_percent else 0:.1f}%")
            
            return {
                "success": True,
                "airline": airline,
                "flight_number": flight_number,
                "date": date,
                "departure_time": departure_time,
                "arrival_time": arrival_time,
                "origin_city": origin_city,
                "origin_iata": origin_iata,
                "destination_city": destination_city,
                "destination_iata": destination_iata,
                "ontime_percent": ontime_percent,
                "delay_risk": delay_risk,
                "total_historical_flights": total_flights,
                "ontime_count": statistics[0],
                "delayed_count": statistics[1],
                "cancelled_count": statistics[2],
                "diverted_count": statistics[3],
                "suggested_premium": suggested_premium,
                "risk_score": risk_score,
                "recommendation": recommendation
            }
            
    except asyncio.TimeoutError:
        return {
            "success": False,
            "error": "Request timed out"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error fetching data: {str(e)}"
        }


@historical_protocol.on_message(model=FlightHistoricalRequest)
async def handle_historical_request(ctx: Context, sender: str, msg: FlightHistoricalRequest):
    """Handle incoming flight historical data requests"""
    ctx.logger.info(f"Received historical data request from {sender}")
    ctx.logger.info(f"Flight: {msg.airline}{msg.flight_number} on {msg.date}")
    
    # Fetch comprehensive data
    result = await fetch_comprehensive_data(msg.airline, msg.flight_number, msg.date)
    
    # Send response
    response = FlightHistoricalResponse(
        success=result.get("success", False),
        airline=result.get("airline", msg.airline),
        flight_number=result.get("flight_number", msg.flight_number),
        date=result.get("date", msg.date),
        departure_time=result.get("departure_time"),
        arrival_time=result.get("arrival_time"),
        origin_city=result.get("origin_city"),
        origin_iata=result.get("origin_iata"),
        destination_city=result.get("destination_city"),
        destination_iata=result.get("destination_iata"),
        ontime_percent=result.get("ontime_percent"),
        delay_risk=result.get("delay_risk"),
        total_historical_flights=result.get("total_historical_flights"),
        ontime_count=result.get("ontime_count"),
        delayed_count=result.get("delayed_count"),
        cancelled_count=result.get("cancelled_count"),
        diverted_count=result.get("diverted_count"),
        suggested_premium=result.get("suggested_premium"),
        risk_score=result.get("risk_score"),
        recommendation=result.get("recommendation"),
        error=result.get("error")
    )
    
    await ctx.send(sender, response)
    
    if result.get("success"):
        ctx.logger.info(f"✅ Sent historical analysis to {sender}")
        ctx.logger.info(f"   Risk: {result.get('delay_risk')}, Score: {result.get('risk_score', 0):.2f}")
    else:
        ctx.logger.warning(f"❌ Error: {result.get('error')}")


# Include protocol
historical_agent.include(historical_protocol)


@historical_agent.on_event("startup")
async def on_startup(ctx: Context):
    """Agent startup event"""
    ctx.logger.info("📈 Flight Historical Data Agent is ready!")
    ctx.logger.info(f"Agent address: {ctx.agent.address}")
    ctx.logger.info("Providing comprehensive flight analysis with risk assessment")
    ctx.logger.info("Waiting for requests...")


if __name__ == "__main__":
    historical_agent.run()
