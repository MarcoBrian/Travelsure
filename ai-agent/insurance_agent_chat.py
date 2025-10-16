"""
Insurance Recommendation Agent for TravelSure - WITH CHAT PROTOCOL
This agent analyzes flight details and recommends appropriate insurance type.
Includes Agentverse Chat Protocol for direct chat in Agentverse dashboard.
"""

from uagents import Agent, Context, Model, Protocol
from datetime import datetime, timedelta
from uuid import uuid4
from typing import Optional
import json
import re

# Import chat protocol from uagents_core - REQUIRED for Agentverse chat button
try:
    from uagents_core.contrib.protocols.chat import (
        ChatMessage,
        ChatAcknowledgement,
        TextContent,
        chat_protocol_spec
    )
    CHAT_PROTOCOL_AVAILABLE = True
except ImportError:
    # Fallback if uagents_core not available
    CHAT_PROTOCOL_AVAILABLE = False
    print("Warning: uagents_core not found. Chat protocol disabled.")


# Define message models for insurance
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


class InsuranceRecommendation(Model):
    """Insurance recommendation model"""
    flight_number: str
    recommended_insurance: str  # "cancellation" or "delay"
    confidence_score: float
    reasoning: str
    risk_factors: list[str]
    estimated_premium: float


# Flight data agent address - OUR CUSTOM AGENT
FLIGHT_AGENT_ADDRESS = "agent1qfvg6tagsupsz6600te6r6frjqy8uks63y02059m5w6u5aevap5scy6dwj6"

# Initialize the insurance recommendation agent
insurance_agent = Agent(
    name="TravelSure-Insurance-Advisor",
    seed="insurance_advisor_secure_seed_phrase_change_this",
    mailbox=True,
)

# Create protocols
insurance_protocol = Protocol("InsuranceRecommendation")

# Create chat protocol using the official spec from uagents_core
if CHAT_PROTOCOL_AVAILABLE:
    chat_protocol = Protocol(spec=chat_protocol_spec)
else:
    chat_protocol = None


def analyze_flight_risk(flight_data: dict) -> dict:
    """
    Analyze flight data and determine insurance recommendation
    
    Args:
        flight_data: Dictionary containing flight details
        
    Returns:
        Dictionary with recommendation, confidence, and reasoning
    """
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
    
    # Analyze route complexity
    origin = flight_data.get('origin', '')
    destination = flight_data.get('destination', '')
    
    international_indicators = ['international', 'transoceanic']
    if any(ind in flight_data.get('route_type', '').lower() for ind in international_indicators):
        cancellation_score += 20
        delay_score += 15
        risk_factors.append("International flight with higher cancellation risk")
    
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
    except:
        pass
    
    # Analyze season/weather factors
    try:
        dep_date = datetime.fromisoformat(flight_data.get('departure_time', ''))
        month = dep_date.month
        
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


def extract_flight_number(text: str) -> Optional[str]:
    """Extract flight number from text"""
    text_upper = text.upper()
    patterns = [
        r'\b([A-Z]{2}\s?\d{3,4})\b',
        r'\bFLIGHT\s+([A-Z]{2}\s?\d{3,4})\b',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text_upper)
        if match:
            flight_num = match.group(1).replace('FLIGHT ', '').replace(' ', '')
            return flight_num
    return None


def format_recommendation_as_text(recommendation: dict, flight_number: str, flight_data: dict = None) -> str:
    """Format recommendation as readable text"""
    response = f"""🛡️ Insurance Recommendation for Flight {flight_number}

"""
    
    # Add flight details if available
    if flight_data:
        airline = flight_data.get('airline', 'Unknown')
        origin = flight_data.get('origin', 'UNK')
        destination = flight_data.get('destination', 'UNK')
        status = flight_data.get('status', 'Unknown')
        response += f"""**Flight Details:**
✈️ {airline} | {origin} → {destination}
📊 Status: {status}

"""
    
    response += f"""**Recommended:** {recommendation['recommendation'].title()} Insurance
**Confidence:** {recommendation['confidence'] * 100:.0f}%
**Premium:** ${recommendation['estimated_premium']:.2f}

**Analysis:** {recommendation['reasoning']}

**Risk Factors:**
"""
    for factor in recommendation['risk_factors']:
        response += f"• {factor}\n"
    
    response += "\n💡 Recommendation based on flight data analysis and historical patterns."
    return response


# ========================================
# CHAT PROTOCOL HANDLERS
# ========================================

if CHAT_PROTOCOL_AVAILABLE and chat_protocol:
    @chat_protocol.on_message(ChatMessage)
    async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
        """Handle incoming chat messages from Agentverse"""
        try:
            # Extract text content
            text_content = None
            for content in msg.content:
                if hasattr(content, 'text'):
                    text_content = content.text
                    break
            
            if not text_content:
                ctx.logger.warning("Received chat message without text content")
                return
            
            ctx.logger.info(f"Chat from {sender}: {text_content}")
            
            # Send acknowledgement
            await ctx.send(
                sender,
                ChatAcknowledgement(
                    timestamp=datetime.now(),
                    acknowledged_msg_id=msg.msg_id
                )
            )
            
            text_lower = text_content.lower()
            
            # Handle greetings
            if any(word in text_lower for word in ['hello', 'hi', 'hey', 'greetings']):
                response_text = """👋 Hello! I'm your TravelSure Insurance Advisor.

I can help you get personalized insurance recommendations for your flights!

**How to use:**
Simply tell me your flight number (e.g., "AA123" or "I have flight DL4567") and I'll analyze it to recommend the best insurance type for you.

**Example:** "What insurance should I get for flight UA890?"

What flight would you like me to analyze?"""
                
                await ctx.send(
                    sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=uuid4(),
                        content=[TextContent(type="text", text=response_text)]
                    )
                )
                return
            
            # Handle help requests
            if 'help' in text_lower:
                response_text = """📋 **How TravelSure Works:**

1. **Provide your flight number** - Just mention it in your message
   Example: "I need insurance for flight AA123"

2. **I analyze the flight** - I check:
   • Airline reliability
   • Flight status and history
   • Route complexity
   • Seasonal factors
   • Departure time patterns

3. **Get recommendation** - I'll suggest:
   • Best insurance type (Cancellation or Delay)
   • Confidence level
   • Risk factors
   • Estimated premium

**Insurance Types:**
🔴 Cancellation Insurance - For flights with higher cancellation risk
🟡 Delay Insurance - For flights with higher delay probability

Just tell me your flight number to get started!"""
                
                await ctx.send(
                    sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=uuid4(),
                        content=[TextContent(type="text", text=response_text)]
                    )
                )
                return
            
            # Try to extract flight number
            flight_number = extract_flight_number(text_content)
            
            if flight_number:
                # Store sender for later response
                ctx.storage.set(f"chat_sender_{flight_number}", sender)
                
                # Send processing message
                processing_text = f"🔍 Analyzing flight {flight_number}... Please wait while I gather the data."
                await ctx.send(
                    sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=uuid4(),
                        content=[TextContent(type="text", text=processing_text)]
                    )
                )
                
                # Request flight details
                ctx.logger.info(f"Requesting flight details for {flight_number}")
                await ctx.send(
                    FLIGHT_AGENT_ADDRESS,
                    FlightDetailsRequest(flight_number=flight_number)
                )
            else:
                # No flight number found
                response_text = """I couldn't find a flight number in your message.

Please provide your flight number in a format like:
• AA123
• DL 4567
• "I have flight UA890"

Or type 'help' for more information."""
                
                await ctx.send(
                    sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=uuid4(),
                        content=[TextContent(type="text", text=response_text)]
                    )
                )
                
        except Exception as e:
            ctx.logger.error(f"Error in chat handler: {e}")
            error_text = "Sorry, I encountered an error. Please try again."
            await ctx.send(
                sender,
                ChatMessage(
                    timestamp=datetime.now(),
                    msg_id=uuid4(),
                    content=[TextContent(type="text", text=error_text)]
                )
            )


    @chat_protocol.on_message(ChatAcknowledgement)
    async def handle_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
        """Handle chat acknowledgements"""
        ctx.logger.info(f"Received ack from {sender} for {msg.acknowledged_msg_id}")

# ========================================
# DIRECT AGENT MESSAGE HANDLERS (for inter-agent communication)
# ========================================

@insurance_agent.on_message(model=FlightDetailsResponse)
async def handle_flight_details(ctx: Context, sender: str, msg: FlightDetailsResponse):
    """Handle flight details from Flight Agent - registered on agent, not protocol"""
    ctx.logger.info(f"[HANDLER] Received flight details for: {msg.flight_number} from {sender}")
    
    try:
        # Analyze flight
        flight_data = {
            'flight_number': msg.flight_number,
            'departure_time': msg.departure_time,
            'arrival_time': msg.arrival_time,
            'airline': msg.airline,
            'origin': msg.origin,
            'destination': msg.destination,
            'status': msg.status
        }
        
        ctx.logger.info(f"Flight data: {flight_data}")
        
        analysis = analyze_flight_risk(flight_data)
        
        ctx.logger.info(f"Analysis complete: {analysis['recommendation']}")
        
        recommendation = InsuranceRecommendation(
            flight_number=msg.flight_number,
            recommended_insurance=analysis['recommendation'],
            confidence_score=analysis['confidence'],
            reasoning=analysis['reasoning'],
            risk_factors=analysis['risk_factors'],
            estimated_premium=analysis['estimated_premium']
        )
        
        # Check if this was from a chat request
        chat_sender = ctx.storage.get(f"chat_sender_{msg.flight_number}")
        
        ctx.logger.info(f"Chat sender for {msg.flight_number}: {chat_sender}")
        
        if chat_sender:
            # Send formatted response via chat
            response_text = format_recommendation_as_text(analysis, msg.flight_number, flight_data)
            
            ctx.logger.info(f"Sending recommendation to {chat_sender}")
            
            await ctx.send(
                chat_sender,
                ChatMessage(
                    timestamp=datetime.now(),
                    msg_id=uuid4(),
                    content=[TextContent(type="text", text=response_text)]
                )
            )
            # Clear the storage entry by setting to None
            ctx.storage.set(f"chat_sender_{msg.flight_number}", None)
            ctx.logger.info(f"Sent chat response for {msg.flight_number}")
        else:
            # Handle non-chat request
            ctx.logger.info(f"No chat sender found, checking for pending request")
            original_sender = ctx.storage.get(f"pending_{msg.flight_number}")
            if original_sender:
                await ctx.send(original_sender, recommendation)
                # Clear the storage entry by setting to None
                ctx.storage.set(f"pending_{msg.flight_number}", None)
                ctx.logger.info(f"Sent insurance recommendation for {msg.flight_number}")
            else:
                ctx.logger.warning(f"No sender found for flight {msg.flight_number}")
            
    except Exception as e:
        ctx.logger.error(f"Error processing flight details: {e}")
        import traceback
        ctx.logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Try to send error message back to chat sender
        chat_sender = ctx.storage.get(f"chat_sender_{msg.flight_number}")
        if chat_sender:
            error_text = f"❌ Sorry, I encountered an error analyzing flight {msg.flight_number}. Please try again."
            await ctx.send(
                chat_sender,
                ChatMessage(
                    timestamp=datetime.now(),
                    msg_id=uuid4(),
                    content=[TextContent(type="text", text=error_text)]
                )
            )
            # Clear the storage entry by setting to None
            ctx.storage.set(f"chat_sender_{msg.flight_number}", None)


# ========================================
# INSURANCE PROTOCOL HANDLERS (for protocol-based requests)
# ========================================

@insurance_protocol.on_message(model=FlightDetailsRequest, replies={InsuranceRecommendation})
async def handle_insurance_request(ctx: Context, sender: str, msg: FlightDetailsRequest):
    """Handle direct insurance requests via protocol"""
    ctx.logger.info(f"Insurance request for flight: {msg.flight_number}")
    
    try:
        await ctx.send(
            FLIGHT_AGENT_ADDRESS,
            FlightDetailsRequest(flight_number=msg.flight_number)
        )
        ctx.storage.set(f"pending_{msg.flight_number}", sender)
        
    except Exception as e:
        ctx.logger.error(f"Error processing insurance request: {e}")
        recommendation = InsuranceRecommendation(
            flight_number=msg.flight_number,
            recommended_insurance="delay",
            confidence_score=0.5,
            reasoning="Unable to fetch complete flight details. Default recommendation.",
            risk_factors=["Limited flight data available"],
            estimated_premium=25.0
        )
        await ctx.send(sender, recommendation)


@insurance_agent.on_interval(period=60.0)
async def log_status(ctx: Context):
    """Periodic status logging"""
    ctx.logger.info("TravelSure Insurance Agent is running...")
    ctx.logger.info(f"Agent Address: {insurance_agent.address}")


# Include both protocols
insurance_agent.include(insurance_protocol, publish_manifest=True)

if CHAT_PROTOCOL_AVAILABLE and chat_protocol:
    insurance_agent.include(chat_protocol, publish_manifest=True)
    chat_status = "ENABLED ✓"
else:
    chat_status = "DISABLED (uagents_core not available)"

# Print agent information
print(f"TravelSure Insurance Advisor Agent with Chat Protocol")
print(f"Agent Address: {insurance_agent.address}")
print(f"Chat Protocol: {chat_status}")
print(f"Connected to Flight Agent: {FLIGHT_AGENT_ADDRESS}")

if __name__ == "__main__":
    insurance_agent.run()
