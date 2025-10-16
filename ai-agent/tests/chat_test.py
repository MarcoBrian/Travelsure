"""
Local Chat Protocol Test for Insurance Agent
This tests the chat protocol functionality locally before deploying to Agentverse
"""

from uagents import Agent, Context, Model, Protocol, Bureau
from datetime import datetime
from uuid import uuid4
from typing import Optional, List
import re

# Define chat models directly (since uagents_core.contrib doesn't exist)
class TextContent(Model):
    """Text content for chat messages"""
    type: str = "text"
    text: str


class ChatMessage(Model):
    """Chat message model"""
    timestamp: datetime
    msg_id: str
    content: List[TextContent]


class ChatAcknowledgement(Model):
    """Chat acknowledgement model"""
    timestamp: datetime
    acknowledged_msg_id: str


CHAT_PROTOCOL_AVAILABLE = True
print("✅ Using local chat protocol models")


# Define insurance models
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


class InsuranceRecommendation(Model):
    """Insurance recommendation model"""
    flight_number: str
    recommended_insurance: str
    confidence_score: float
    reasoning: str
    risk_factors: list[str]
    estimated_premium: float


# Mock flight database
MOCK_FLIGHTS = {
    "AA123": {
        "airline": "American Airlines",
        "origin": "JFK",
        "destination": "LAX",
        "departure_time": "2025-10-21T08:00:00",
        "arrival_time": "2025-10-21T11:30:00",
        "status": "scheduled"
    },
    "DL456": {
        "airline": "Delta",
        "origin": "ATL",
        "destination": "SEA",
        "departure_time": "2025-10-19T18:00:00",
        "arrival_time": "2025-10-19T21:00:00",
        "status": "delayed"
    },
    "F9100": {
        "airline": "Frontier",
        "origin": "DEN",
        "destination": "LAS",
        "departure_time": "2025-10-18T20:00:00",
        "arrival_time": "2025-10-18T21:30:00",
        "status": "scheduled"
    }
}


# Initialize insurance agent
insurance_agent = Agent(
    name="TravelSure-Insurance-Chat-Test",
    seed="insurance_chat_test_seed",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"]
)

# Create protocols
insurance_protocol = Protocol("InsuranceRecommendation")
chat_protocol = Protocol("ChatProtocol")


def analyze_flight_risk(flight_data: dict) -> dict:
    """Analyze flight data and determine insurance recommendation"""
    risk_factors = []
    delay_score = 0
    cancellation_score = 0
    
    airline = flight_data.get('airline', '').lower()
    budget_airlines = ['spirit', 'frontier', 'ryanair', 'allegiant']
    
    if any(budget in airline for budget in budget_airlines):
        delay_score += 30
        risk_factors.append("Budget airline with higher delay rates")
    
    status = flight_data.get('status', '').lower()
    if 'delay' in status:
        delay_score += 40
        risk_factors.append("Current flight status shows delays")
    elif 'cancel' in status:
        cancellation_score += 50
        risk_factors.append("Flight has cancellation history")
    
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
    
    if cancellation_score > delay_score:
        recommendation = "cancellation"
        confidence = min(cancellation_score / 100, 0.95)
        reasoning = "Flight analysis suggests higher cancellation risk. Cancellation insurance recommended."
    else:
        recommendation = "delay"
        confidence = min(delay_score / 100, 0.95)
        reasoning = "Flight analysis suggests higher delay risk. Delay insurance recommended."
    
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


def format_recommendation_as_text(recommendation: dict, flight_number: str) -> str:
    """Format recommendation as readable text"""
    response = f"""🛡️ Insurance Recommendation for Flight {flight_number}

**Recommended:** {recommendation['recommendation'].title()} Insurance
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

@chat_protocol.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handle incoming chat messages"""
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
        
        ctx.logger.info(f"\n{'='*70}")
        ctx.logger.info(f"💬 CHAT MESSAGE from {sender[:20]}...")
        ctx.logger.info(f"📝 Message: {text_content}")
        ctx.logger.info(f"{'='*70}")
        
        # Send acknowledgement
        await ctx.send(
            sender,
            ChatAcknowledgement(
                timestamp=datetime.now(),
                acknowledged_msg_id=msg.msg_id
            )
        )
        ctx.logger.info("✅ Sent acknowledgement")
        
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
                    msg_id=str(uuid4()),
                    content=[TextContent(type="text", text=response_text)]
                )
            )
            ctx.logger.info("📤 Sent greeting response")
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
                    msg_id=str(uuid4()),
                    content=[TextContent(type="text", text=response_text)]
                )
            )
            ctx.logger.info("📤 Sent help response")
            return
        
        # Try to extract flight number
        flight_number = extract_flight_number(text_content)
        
        if flight_number:
            ctx.logger.info(f"✈️  Extracted flight number: {flight_number}")
            
            # Get mock flight data
            flight_data = MOCK_FLIGHTS.get(flight_number.upper())
            
            if flight_data:
                # Send processing message
                processing_text = f"🔍 Analyzing flight {flight_number}... Please wait."
                await ctx.send(
                    sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=str(uuid4()),
                        content=[TextContent(type="text", text=processing_text)]
                    )
                )
                ctx.logger.info("📤 Sent processing message")
                
                # Analyze flight
                analysis = analyze_flight_risk(flight_data)
                response_text = format_recommendation_as_text(analysis, flight_number)
                
                # Send recommendation
                await ctx.send(
                    sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=str(uuid4()),
                        content=[TextContent(type="text", text=response_text)]
                    )
                )
                ctx.logger.info("📤 Sent insurance recommendation")
            else:
                # Flight not found
                response_text = f"""❌ Sorry, I couldn't find flight {flight_number} in the database.

Available test flights:
• AA123 - American Airlines (JFK → LAX)
• DL456 - Delta (ATL → SEA) 
• F9100 - Frontier (DEN → LAS)

Please try one of these flight numbers!"""
                
                await ctx.send(
                    sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=str(uuid4()),
                        content=[TextContent(type="text", text=response_text)]
                    )
                )
                ctx.logger.info("📤 Sent flight not found message")
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
                    msg_id=str(uuid4()),
                    content=[TextContent(type="text", text=response_text)]
                )
            )
            ctx.logger.info("📤 Sent 'no flight number' message")
            
    except Exception as e:
        ctx.logger.error(f"❌ Error in chat handler: {e}")
        error_text = "Sorry, I encountered an error. Please try again."
        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.now(),
                msg_id=str(uuid4()),
                content=[TextContent(type="text", text=error_text)]
            )
        )


    @chat_protocol.on_message(ChatAcknowledgement)
    async def handle_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
        """Handle chat acknowledgements"""
        ctx.logger.info(f"✅ Received ack from {sender[:20]}... for {msg.acknowledged_msg_id}")


# Include protocols
insurance_agent.include(insurance_protocol, publish_manifest=True)
insurance_agent.include(chat_protocol, publish_manifest=True)
print("✅ Chat protocol included in agent")


# ========================================
# TEST CLIENT AGENT
# ========================================

test_client = Agent(
    name="chat-test-client",
    seed="chat_test_client_seed",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"]
)


# Test messages to send
TEST_MESSAGES = [
    "Hello!",
    "help",
    "What insurance should I get for flight AA123?",
    "I need insurance for DL456",
    "Can you check flight F9100?",
    "What about flight XY999?",  # Non-existent flight
]


@test_client.on_interval(period=8.0)
async def send_test_chat(ctx: Context):
    """Send test chat messages"""
    test_count = int(ctx.storage.get("test_count") or 0)
    
    if test_count >= len(TEST_MESSAGES):
        ctx.logger.info("\n" + "="*70)
        ctx.logger.info("🎉 All test messages sent! Continuing to loop...")
        ctx.logger.info("="*70 + "\n")
        test_count = 0
    
    message_text = TEST_MESSAGES[test_count]
    
    ctx.logger.info("\n" + "="*70)
    ctx.logger.info(f"📨 SENDING TEST MESSAGE #{test_count + 1}")
    ctx.logger.info(f"💬 Message: {message_text}")
    ctx.logger.info("="*70)
    
    chat_msg = ChatMessage(
        timestamp=datetime.now(),
        msg_id=str(uuid4()),
        content=[TextContent(type="text", text=message_text)]
    )
    
    await ctx.send(insurance_agent.address, chat_msg)
    ctx.storage.set("test_count", test_count + 1)


@test_client.on_message(ChatMessage)
async def handle_chat_response(ctx: Context, sender: str, msg: ChatMessage):
    """Handle chat responses from insurance agent"""
    text_content = None
    for content in msg.content:
        if hasattr(content, 'text'):
            text_content = content.text
            break
    
    ctx.logger.info("\n" + "="*70)
    ctx.logger.info("📥 RECEIVED CHAT RESPONSE")
    ctx.logger.info("="*70)
    ctx.logger.info(text_content)
    ctx.logger.info("="*70 + "\n")
    
    # Send acknowledgement
    await ctx.send(
        sender,
        ChatAcknowledgement(
            timestamp=datetime.now(),
            acknowledged_msg_id=msg.msg_id
        )
    )


@test_client.on_message(ChatAcknowledgement)
async def handle_ack_response(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Handle acknowledgements"""
    ctx.logger.info(f"✅ Received ack for message {msg.acknowledged_msg_id}")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("🧪 TRAVELSURE CHAT PROTOCOL TEST")
    print("="*80)
    
    print(f"\n📍 Insurance Agent Address: {insurance_agent.address}")
    print(f"📍 Test Client Address: {test_client.address}")
    
    print("\n📋 Test Sequence:")
    for i, msg in enumerate(TEST_MESSAGES, 1):
        print(f"   {i}. \"{msg}\"")
    
    print("\n🔄 Test messages will be sent every 8 seconds")
    print("📊 Watch for chat exchanges below")
    print("⏹️  Press Ctrl+C to stop")
    print("="*80 + "\n")
    
    bureau = Bureau()
    bureau.add(insurance_agent)
    bureau.add(test_client)
    
    try:
        bureau.run()
    except KeyboardInterrupt:
        print("\n\n" + "="*80)
        print("🛑 Test stopped by user")
        print("="*80)
