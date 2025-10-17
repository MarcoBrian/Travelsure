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


# ========================================
# MESSAGE MODELS FOR FLIGHT HISTORICAL AGENT
# ========================================

class FlightHistoricalRequest(Model):
    """Request model for comprehensive flight data"""
    airline: str  # IATA airline code (e.g., "AA")
    flight_number: str  # Flight number only (e.g., "100")
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


class InsuranceOption(Model):
    """Individual insurance option with time-based threshold"""
    option_type: str  # "delay_2h", "delay_4h", "delay_6h", "delay_8h", "delay_12h"
    name: str  # Display name (e.g., "2-Hour Threshold")
    description: str  # Payout description (e.g., "Claim $200 if delay exceeds 2 hours")
    coverage_details: list[str]  # Smart contract payout details
    premium: float  # Premium amount in USD
    recommended: bool  # Whether this option is recommended based on flight risk


class InsuranceRecommendation(Model):
    """Insurance recommendation model with multiple options"""
    flight_number: str
    recommended_insurance: str  # Primary recommendation
    confidence_score: float
    reasoning: str
    risk_factors: list[str]
    estimated_premium: float
    route_info: Optional[str] = None
    risk_level: Optional[str] = None  # LOW/MEDIUM/HIGH
    insurance_options: list[InsuranceOption] = []  # All available options


# NEW Flight Historical Agent - provides comprehensive analysis
FLIGHT_HISTORICAL_AGENT = "agent1q2zezue4jw024qrr7q22f40zcufp593rhnzwya7el2cn8kz5kas7zxmcrdn"

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


def calculate_insurance_options(flight_data: FlightHistoricalResponse, base_premium: float, risk_score: float) -> list[dict]:
    """
    Calculate all available insurance options with pricing
    
    Args:
        flight_data: FlightHistoricalResponse with complete analysis
        base_premium: Base premium amount
        risk_score: Risk score (0.0 to 1.0)
        
    Returns:
        List of insurance option dictionaries
    """
    options = []
    
    # Calculate cancellation risk
    cancellation_rate = 0
    if flight_data.cancelled_count and flight_data.total_historical_flights:
        cancellation_rate = (flight_data.cancelled_count / flight_data.total_historical_flights)
    
    # Calculate delay rate
    delay_rate = 1 - (flight_data.ontime_percent if flight_data.ontime_percent else 0.5)
    
    # Time-bound delay insurance
    # Lower threshold = Lower payout (less risky for insurer if flight often on-time)
    # Higher threshold = Higher payout (more compensation for extreme delays)
    
    # 2-HOUR THRESHOLD - Lowest payout, best for reliable flights
    delay_2h_premium = round(base_premium * 0.3 * (1 + delay_rate * 0.5), 2)
    options.append({
        "option_type": "delay_2h",
        "name": "2-Hour Threshold",
        "description": "Claim payout if delay exceeds 2 hours",
        "coverage_details": ["Payout via smart contract when delay > 2 hours"],
        "premium": delay_2h_premium,
        "recommended": delay_rate < 0.15  # Low delay risk - good for reliable flights
    })
    
    # 4-HOUR THRESHOLD - Low-medium payout
    delay_4h_premium = round(base_premium * 0.4 * (1 + delay_rate * 0.8), 2)
    options.append({
        "option_type": "delay_4h",
        "name": "4-Hour Threshold",
        "description": "Claim payout if delay exceeds 4 hours",
        "coverage_details": ["Payout via smart contract when delay > 4 hours"],
        "premium": delay_4h_premium,
        "recommended": delay_rate >= 0.15 and delay_rate < 0.25
    })
    
    # 6-HOUR THRESHOLD - Medium payout
    delay_6h_premium = round(base_premium * 0.5 * (1 + delay_rate * 1.0), 2)
    options.append({
        "option_type": "delay_6h",
        "name": "6-Hour Threshold",
        "description": "Claim payout if delay exceeds 6 hours",
        "coverage_details": ["Payout via smart contract when delay > 6 hours"],
        "premium": delay_6h_premium,
        "recommended": delay_rate >= 0.25 and delay_rate < 0.35
    })
    
    # 8-HOUR THRESHOLD - Higher payout, good for often-delayed flights
    delay_8h_premium = round(base_premium * 0.6 * (1 + delay_rate * 1.3), 2)
    options.append({
        "option_type": "delay_8h",
        "name": "8-Hour Threshold",
        "description": "Claim payout if delay exceeds 8 hours",
        "coverage_details": ["Payout via smart contract when delay > 8 hours"],
        "premium": delay_8h_premium,
        "recommended": delay_rate >= 0.35 and delay_rate < 0.5
    })
    
    # 12-HOUR THRESHOLD - Highest payout, for frequently delayed flights
    delay_12h_premium = round(base_premium * 0.7 * (1 + delay_rate * 1.5), 2)
    options.append({
        "option_type": "delay_12h",
        "name": "12-Hour Threshold",
        "description": "Claim payout if delay exceeds 12 hours",
        "coverage_details": ["Payout via smart contract when delay > 12 hours"],
        "premium": delay_12h_premium,
        "recommended": delay_rate >= 0.5  # High delay risk
    })
    
    return options


def analyze_comprehensive_risk(flight_data: FlightHistoricalResponse) -> dict:
    """
    Analyze flight data using comprehensive historical data from Historical Agent
    
    Args:
        flight_data: FlightHistoricalResponse with complete analysis
        
    Returns:
        Dictionary with recommendation, confidence, reasoning, and insurance options
    """
    risk_factors = []
    
    # Use the risk assessment from Historical Agent
    risk_score = flight_data.risk_score if flight_data.risk_score else 0.5
    delay_risk = flight_data.delay_risk if flight_data.delay_risk else "MEDIUM"
    ontime_percent = flight_data.ontime_percent if flight_data.ontime_percent else 0.5
    
    # Calculate base premium
    if flight_data.suggested_premium:
        base_premium = min(flight_data.suggested_premium / 1_000_000, 50.0)
    else:
        base_premium = 25.0
    
    # Generate all insurance options
    insurance_options = calculate_insurance_options(flight_data, base_premium, risk_score)
    
    # Calculate delay rate for better recommendations
    delay_rate = 1 - ontime_percent
    
    # Determine primary recommendation based on delay patterns
    # Logic: If flight is reliable (low delay rate), recommend lower threshold
    #        If flight is often delayed, recommend higher threshold
    
    if delay_rate < 0.15:
        # Excellent reliability - recommend 2-hour threshold
        # Flight rarely delays, so if it does delay, it's unexpected
        recommendation = "delay_2h"
        confidence = 0.90
        reasoning = f"This flight has excellent {delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 2-hour threshold recommended - flight is highly reliable, so coverage for any delay provides peace of mind."
        
        risk_factors.append(f"Excellent on-time record: {ontime_percent*100:.1f}%")
        risk_factors.append(f"Low historical delays - any delay would be unusual")
        
    elif delay_rate < 0.25:
        # Good reliability - recommend 4-hour threshold
        recommendation = "delay_4h"
        confidence = 0.85
        reasoning = f"This flight has good {delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 4-hour threshold recommended for balanced protection."
        
        risk_factors.append(f"Good on-time rate: {ontime_percent*100:.1f}%")
        
        if flight_data.delayed_count:
            risk_factors.append(f"Past delays: {flight_data.delayed_count} recorded")
    
    elif delay_rate < 0.35:
        # Moderate delays - recommend 6-hour threshold
        recommendation = "delay_6h"
        confidence = 0.80
        reasoning = f"This flight has {delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 6-hour threshold recommended - moderate delay history suggests coverage for significant delays."
        
        risk_factors.append(f"Historical on-time rate: {ontime_percent*100:.1f}%")
        
        if flight_data.delayed_count and flight_data.total_historical_flights:
            delay_rate_percent = (flight_data.delayed_count / flight_data.total_historical_flights) * 100
            risk_factors.append(f"Delay rate: {delay_rate_percent:.1f}% based on {flight_data.total_historical_flights} flights")
    
    elif delay_rate < 0.5:
        # Frequent delays - recommend 8-hour threshold
        recommendation = "delay_8h"
        confidence = 0.85
        reasoning = f"This flight has {delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 8-hour threshold recommended - frequent delay history means coverage for extended delays is valuable."
        
        if flight_data.delayed_count and flight_data.total_historical_flights:
            delay_rate_percent = (flight_data.delayed_count / flight_data.total_historical_flights) * 100
            risk_factors.append(f"High delay rate: {delay_rate_percent:.1f}% based on {flight_data.total_historical_flights} flights")
        
        risk_factors.append(f"Flight often experiences delays")
            
    else:
        # Very frequent delays - recommend 12-hour threshold
        recommendation = "delay_12h"
        confidence = 0.90
        reasoning = f"This flight has {delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 12-hour threshold recommended - flight frequently delayed, focus on extreme delay protection."
        
        if flight_data.delayed_count and flight_data.total_historical_flights:
            delay_rate_percent = (flight_data.delayed_count / flight_data.total_historical_flights) * 100
            risk_factors.append(f"Very high delay rate: {delay_rate_percent:.1f}% based on {flight_data.total_historical_flights} flights")
        
        risk_factors.append(f"Flight has significant delay history")
        
    # Add cancellation info if relevant
    if flight_data.cancelled_count and flight_data.cancelled_count > 0:
        risk_factors.append(f"Cancellation history: {flight_data.cancelled_count} cancellations recorded")
    
    # Add route information
    if flight_data.origin_city and flight_data.destination_city:
        risk_factors.append(f"Route: {flight_data.origin_city} → {flight_data.destination_city}")
    
    # Find the recommended option's premium
    recommended_option = next((opt for opt in insurance_options if opt["option_type"] == recommendation), None)
    estimated_premium = recommended_option["premium"] if recommended_option else base_premium
    
    return {
        "recommendation": recommendation,
        "confidence": confidence,
        "reasoning": reasoning,
        "risk_factors": risk_factors,
        "estimated_premium": estimated_premium,
        "risk_level": delay_risk,
        "route": f"{flight_data.origin_iata or 'UNK'} → {flight_data.destination_iata or 'UNK'}",
        "insurance_options": insurance_options
    }


def parse_flight_input(text: str) -> Optional[tuple[str, str, str]]:
    """
    Extract airline, flight number, and date from text
    
    Returns:
        Tuple of (airline, flight_number, date) or None
    """
    text_upper = text.upper()
    
    # Try to extract flight number (airline code + number)
    flight_pattern = r'\b([A-Z]{2})\s?(\d{1,4})\b'
    match = re.search(flight_pattern, text_upper)
    
    if not match:
        return None
    
    airline = match.group(1)
    flight_number = match.group(2)
    
    # Try to extract date
    date = None
    date_patterns = [
        r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
        r'(\d{2}/\d{2}/\d{4})',  # MM/DD/YYYY
        r'(TODAY|TOMORROW)',
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, text_upper)
        if date_match:
            date_str = date_match.group(1)
            if date_str == 'TODAY':
                date = datetime.now().strftime('%Y-%m-%d')
            elif date_str == 'TOMORROW':
                date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
            elif '/' in date_str:
                # Convert MM/DD/YYYY to YYYY-MM-DD
                parts = date_str.split('/')
                date = f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
            else:
                date = date_str
            break
    
    # Default to tomorrow if no date specified
    if not date:
        date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    
    return airline, flight_number, date


def format_recommendation_as_text(analysis: dict, airline: str, flight_number: str, date: str, flight_data: FlightHistoricalResponse = None) -> str:
    """Format recommendation as readable text with all insurance options"""
    
    # Insurance type emoji
    insurance_emoji = {
        "delay_2h": "⏰",
        "delay_4h": "⏱️",
        "delay_6h": "⏲️",
        "delay_8h": "🕐",
        "delay_12h": "🕛",
        "delay": "⏱️"
    }
    
    emoji = insurance_emoji.get(analysis['recommendation'], "🛡️")
    
    response = f"""{emoji} **Insurance Recommendation for Flight {airline}{flight_number}**

"""
    
    # Add flight details if available
    if flight_data and flight_data.success:
        response += f"""**Flight Details:**
✈️ {airline}{flight_number} | {analysis.get('route', 'N/A')}
📍 {flight_data.origin_city or 'Unknown'} → {flight_data.destination_city or 'Unknown'}
📅 {date}
🕐 Departure: {flight_data.departure_time[:16] if flight_data.departure_time else 'N/A'}

**Performance Metrics:**
📊 On-time Rate: {flight_data.ontime_percent*100:.1f}% ({flight_data.ontime_count}/{flight_data.total_historical_flights} flights)
⚠️ Risk Level: {analysis.get('risk_level', 'MEDIUM')}
📈 Historical Delays: {flight_data.delayed_count}
� Cancellations: {flight_data.cancelled_count}

"""
    
    response += f"""**Our Recommendation:** {analysis['recommendation'].replace('_', ' ').title()}
**Confidence:** {analysis['confidence'] * 100:.0f}%

**Analysis:**
{analysis['reasoning']}

**Key Risk Factors:**
"""
    for factor in analysis['risk_factors']:
        response += f"• {factor}\n"
    
    # Display all insurance options
    response += "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    response += "**📋 AVAILABLE INSURANCE OPTIONS**\n"
    response += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    insurance_options = analysis.get('insurance_options', [])
    
    # Update emoji map for new options
    insurance_emoji_extended = {
        "delay_2h": "⏰",
        "delay_4h": "⏱️",
        "delay_6h": "⏲️",
        "delay_8h": "🕐",
        "delay_12h": "🕛",
        "delay": "⏱️"
    }
    
    for idx, option in enumerate(insurance_options, 1):
        option_emoji = insurance_emoji_extended.get(option['option_type'], "📄")
        is_recommended = option.get('recommended', False) or option['option_type'] == analysis['recommendation']
        
        # Add star for recommended option
        rec_marker = " ⭐ **RECOMMENDED**" if is_recommended else ""
        
        response += f"""**{idx}. {option_emoji} {option['name']}**{rec_marker}
💵 Premium: **${option['premium']:.2f}**

{option['description']}
"""
        response += "\n"
    
    response += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    response += "🌐 **Visit travelsure.vercel.app to purchase insurance**\n"
    response += "⚡ Smart contract powered • Instant payouts • No paperwork\n\n"
    response += "💎 **Bonus: Stake & Earn!**\n"
    response += "Stake your funds on TravelSure to:\n"
    response += "  • Earn competitive yields on your staked amount\n"
    response += "  • Get FREE cancellation insurance automatically\n"
    response += "  • Support the insurance pool and earn rewards\n\n"
    response += "💡 *All recommendations based on real-time data and historical flight performance*"
    
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

I analyze flights using real-time data and historical performance to recommend the best insurance coverage!

**How to use:**
Tell me your flight number and date:
• "Check flight AA100 on 2025-10-20"
• "I have UA890 tomorrow"
• "Analyze BA001 today"

**I analyze:**
✈️ Real-time flight schedules
📊 Historical on-time performance (76+ flights)
⚠️ Delay and cancellation rates
🌍 Route complexity

**Time-Based Insurance Options:**
⏰ 2-Hour Threshold (Reliable flights)
⏱️ 4-Hour Threshold (Good reliability)
⏲️ 6-Hour Threshold (Moderate delays)
🕐 8-Hour Threshold (Frequent delays)
🕛 12-Hour Threshold (Very delayed flights)

💡 Choose threshold based on flight reliability
🌐 Purchase at: travelsure.vercel.app

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
                response_text = """📋 **TravelSure Insurance Advisor - Help**

**How It Works:**
1. **Tell me your flight** - Include airline code + number and optional date
   • "AA100 on 2025-10-20"
   • "UA890 tomorrow"
   • "BA001"

2. **I fetch comprehensive data** - Using Flight Historical Agent:
   • Real-time schedule from FlightDelay API
   • Historical performance statistics (76+ flights)
   • Risk assessment (LOW/MEDIUM/HIGH)
   • On-time percentage and delay patterns

3. **Get personalized recommendations** with time-threshold options:
   ⏰ **2-Hour Threshold** - Best for reliable flights
   ⏱️ **4-Hour Threshold** - Good for consistent flights
   ⏲️ **6-Hour Threshold** - Moderate delay protection
   🕐 **8-Hour Threshold** - For frequently delayed flights
   🕛 **12-Hour Threshold** - Extreme delay coverage

**How It Works:**
• AI analyzes flight reliability and recommends threshold
• Reliable flights → Lower threshold (2-4 hours)
• Often delayed → Higher threshold (8-12 hours)
• Pay premium via smart contract on travelsure.vercel.app
• If delay exceeds threshold, claim payout instantly
• No paperwork, automated smart contract execution

**💎 Bonus Feature - Stake & Earn:**
• Stake funds on travelsure.vercel.app
• Earn yields on your staked amount
• Get FREE cancellation insurance
• Support the insurance pool

**Example:**
"I need insurance for flight AA100 on 2025-10-25"

Ready to analyze your flight and show you all available options!"""
                
                await ctx.send(
                    sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=uuid4(),
                        content=[TextContent(type="text", text=response_text)]
                    )
                )
                return
            
            # Try to parse flight information
            flight_info = parse_flight_input(text_content)
            
            if flight_info:
                airline, flight_number, date = flight_info
                full_flight_id = f"{airline}{flight_number}-{date}"
                
                # Store sender for later response
                ctx.storage.set(f"chat_sender_{full_flight_id}", sender)
                ctx.storage.set(f"chat_airline_{full_flight_id}", airline)
                ctx.storage.set(f"chat_flight_{full_flight_id}", flight_number)
                ctx.storage.set(f"chat_date_{full_flight_id}", date)
                
                # Send processing message
                processing_text = f"🔍 Analyzing flight {airline}{flight_number} on {date}...\n\nFetching comprehensive data from Flight Historical Agent:\n• Schedule information\n• Historical performance\n• Risk assessment\n\nPlease wait..."
                await ctx.send(
                    sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=uuid4(),
                        content=[TextContent(type="text", text=processing_text)]
                    )
                )
                
                # Request comprehensive flight analysis
                ctx.logger.info(f"Requesting historical data for {airline}{flight_number} on {date}")
                await ctx.send(
                    FLIGHT_HISTORICAL_AGENT,
                    FlightHistoricalRequest(
                        airline=airline,
                        flight_number=flight_number,
                        date=date
                    )
                )
            else:
                # No flight number found
                response_text = """❌ I couldn't find a valid flight number in your message.

**Please provide:**
• Airline code (2 letters): AA, UA, BA, DL, etc.
• Flight number: 100, 890, 001, etc.
• Date (optional): 2025-10-20, tomorrow, today

**Examples:**
• "Check flight AA100 on 2025-10-20"
• "I have UA890 tomorrow"
• "Analyze BA001"

Type 'help' for more information."""
                
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

# ========================================
# FLIGHT HISTORICAL AGENT RESPONSE HANDLER
# ========================================

@insurance_agent.on_message(model=FlightHistoricalResponse)
async def handle_flight_historical_data(ctx: Context, sender: str, msg: FlightHistoricalResponse):
    """Handle comprehensive flight data from Flight Historical Agent"""
    ctx.logger.info(f"[HANDLER] Received historical data for: {msg.airline}{msg.flight_number} on {msg.date}")
    
    try:
        full_flight_id = f"{msg.airline}{msg.flight_number}-{msg.date}"
        
        if not msg.success:
            # Handle error from Historical Agent
            ctx.logger.error(f"Historical Agent error: {msg.error}")
            
            chat_sender = ctx.storage.get(f"chat_sender_{full_flight_id}")
            if chat_sender:
                error_text = f"❌ Unable to analyze flight {msg.airline}{msg.flight_number}:\n\n{msg.error}\n\nPlease verify the flight number and date, then try again."
                await ctx.send(
                    chat_sender,
                    ChatMessage(
                        timestamp=datetime.now(),
                        msg_id=uuid4(),
                        content=[TextContent(type="text", text=error_text)]
                    )
                )
                ctx.storage.set(f"chat_sender_{full_flight_id}", None)
            return
        
        # Analyze the comprehensive data
        ctx.logger.info(f"Analyzing comprehensive data: Risk={msg.delay_risk}, On-time={msg.ontime_percent}")
        analysis = analyze_comprehensive_risk(msg)
        
        ctx.logger.info(f"Analysis complete: {analysis['recommendation']} (confidence: {analysis['confidence']:.2f})")
        
        # Create InsuranceOption objects from the analysis
        insurance_options_objects = []
        for opt in analysis.get('insurance_options', []):
            insurance_options_objects.append(
                InsuranceOption(
                    option_type=opt['option_type'],
                    name=opt['name'],
                    description=opt['description'],
                    coverage_details=opt['coverage_details'],
                    premium=opt['premium'],
                    recommended=opt.get('recommended', False)
                )
            )
        
        # Create recommendation object
        recommendation = InsuranceRecommendation(
            flight_number=f"{msg.airline}{msg.flight_number}",
            recommended_insurance=analysis['recommendation'],
            confidence_score=analysis['confidence'],
            reasoning=analysis['reasoning'],
            risk_factors=analysis['risk_factors'],
            estimated_premium=analysis['estimated_premium'],
            route_info=analysis.get('route'),
            risk_level=analysis.get('risk_level'),
            insurance_options=insurance_options_objects
        )
        
        # Check if this was from a chat request
        chat_sender = ctx.storage.get(f"chat_sender_{full_flight_id}")
        
        if chat_sender:
            # Send formatted response via chat
            airline = ctx.storage.get(f"chat_airline_{full_flight_id}")
            flight_number = ctx.storage.get(f"chat_flight_{full_flight_id}")
            date = ctx.storage.get(f"chat_date_{full_flight_id}")
            
            response_text = format_recommendation_as_text(analysis, airline, flight_number, date, msg)
            
            ctx.logger.info(f"Sending recommendation to {chat_sender}")
            
            await ctx.send(
                chat_sender,
                ChatMessage(
                    timestamp=datetime.now(),
                    msg_id=uuid4(),
                    content=[TextContent(type="text", text=response_text)]
                )
            )
            
            # Clear storage
            ctx.storage.set(f"chat_sender_{full_flight_id}", None)
            ctx.storage.set(f"chat_airline_{full_flight_id}", None)
            ctx.storage.set(f"chat_flight_{full_flight_id}", None)
            ctx.storage.set(f"chat_date_{full_flight_id}", None)
            
            ctx.logger.info(f"Sent chat response for {msg.airline}{msg.flight_number}")
        else:
            # Handle non-chat request (direct protocol message)
            ctx.logger.info(f"No chat sender found, checking for pending request")
            original_sender = ctx.storage.get(f"pending_{full_flight_id}")
            if original_sender:
                await ctx.send(original_sender, recommendation)
                ctx.storage.set(f"pending_{full_flight_id}", None)
                ctx.logger.info(f"Sent insurance recommendation to {original_sender}")
            else:
                ctx.logger.warning(f"No sender found for flight {full_flight_id}")
            
    except Exception as e:
        ctx.logger.error(f"Error processing historical data: {e}")
        import traceback
        ctx.logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Try to send error message back to chat sender
        full_flight_id = f"{msg.airline}{msg.flight_number}-{msg.date}"
        chat_sender = ctx.storage.get(f"chat_sender_{full_flight_id}")
        if chat_sender:
            error_text = f"❌ Sorry, I encountered an error analyzing flight {msg.airline}{msg.flight_number}. Please try again."
            await ctx.send(
                chat_sender,
                ChatMessage(
                    timestamp=datetime.now(),
                    msg_id=uuid4(),
                    content=[TextContent(type="text", text=error_text)]
                )
            )
            ctx.storage.set(f"chat_sender_{full_flight_id}", None)


# ========================================
# INSURANCE PROTOCOL HANDLERS (for protocol-based requests)
# ========================================

@insurance_protocol.on_message(model=FlightHistoricalRequest, replies={InsuranceRecommendation})
async def handle_insurance_request(ctx: Context, sender: str, msg: FlightHistoricalRequest):
    """Handle direct insurance requests via protocol"""
    ctx.logger.info(f"Insurance request for flight: {msg.airline}{msg.flight_number} on {msg.date}")
    
    try:
        full_flight_id = f"{msg.airline}{msg.flight_number}-{msg.date}"
        ctx.storage.set(f"pending_{full_flight_id}", sender)
        
        # Forward to Historical Agent
        await ctx.send(
            FLIGHT_HISTORICAL_AGENT,
            FlightHistoricalRequest(
                airline=msg.airline,
                flight_number=msg.flight_number,
                date=msg.date
            )
        )
        
    except Exception as e:
        ctx.logger.error(f"Error processing insurance request: {e}")
        # Send default recommendation on error
        recommendation = InsuranceRecommendation(
            flight_number=f"{msg.airline}{msg.flight_number}",
            recommended_insurance="delay",
            confidence_score=0.5,
            reasoning="Unable to fetch complete flight details. Default recommendation based on limited data.",
            risk_factors=["Limited flight data available"],
            estimated_premium=25.0,
            route_info="Unknown",
            risk_level="MEDIUM"
        )
        await ctx.send(sender, recommendation)


@insurance_agent.on_interval(period=120.0)
async def log_status(ctx: Context):
    """Periodic status logging"""
    ctx.logger.info("TravelSure Insurance Agent is running...")
    ctx.logger.info(f"Agent Address: {insurance_agent.address}")
    ctx.logger.info(f"Connected to Flight Historical Agent: {FLIGHT_HISTORICAL_AGENT}")


# Include both protocols
insurance_agent.include(insurance_protocol, publish_manifest=True)

if CHAT_PROTOCOL_AVAILABLE and chat_protocol:
    insurance_agent.include(chat_protocol, publish_manifest=True)
    chat_status = "ENABLED ✓"
else:
    chat_status = "DISABLED (uagents_core not available)"

# Print agent information
print("="*70)
print("TravelSure Insurance Advisor Agent - UPDATED")
print("="*70)
print(f"Agent Address: {insurance_agent.address}")
print(f"Chat Protocol: {chat_status}")
print(f"Connected to Flight Historical Agent: {FLIGHT_HISTORICAL_AGENT}")
print(f"\nFeatures:")
print(f"  ✅ Comprehensive flight data analysis")
print(f"  ✅ Real-time schedule + historical performance")
print(f"  ✅ Risk assessment (LOW/MEDIUM/HIGH)")
print(f"  ✅ Smart insurance recommendations")
print(f"  ✅ Agentverse chat interface")
print("="*70)

if __name__ == "__main__":
    insurance_agent.run()
