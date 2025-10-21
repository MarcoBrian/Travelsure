"""
Insurance Recommendation Agent for TravelSure - WITH CHAT PROTOCOL
This agent analyzes flight details and recommends appropriate insurance type.
Includes Agentverse Chat Protocol for direct chat in Agentverse dashboard.
"""

from uagents import Agent, Context, Model, Protocol
from datetime import datetime, timedelta
from uuid import uuid4
from typing import Optional
import os
import json
import re
import traceback
import asyncio

# Import MeTTa components
try:
    from hyperon import MeTTa
    from metta.knowledge import initialize_insurance_knowledge
    from metta.insurance_rag import InsuranceRAG
    METTA_AVAILABLE = True
    print("✅ MeTTa integration enabled")
except ImportError:
    METTA_AVAILABLE = False
    print("⚠️ MeTTa not available - using fallback logic")

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


# ========================================
# WEATHER AGENT MESSAGE MODELS
# ========================================

class WeatherRequest(Model):
    """Request weather data for an airport location"""
    airport_code: str  # IATA airport code
    city: Optional[str] = None  # City name (if known)
    
    
class WeatherResponse(Model):
    """Weather data response"""
    success: bool
    airport_code: str
    city: Optional[str] = None
    
    # Weather details
    condition: Optional[str] = None  # clear, rain, snow, thunderstorm, fog, clouds
    description: Optional[str] = None  # Detailed weather description
    temperature: Optional[float] = None  # Temperature in Celsius
    humidity: Optional[int] = None  # Humidity percentage
    wind_speed: Optional[float] = None  # Wind speed in m/s
    visibility: Optional[int] = None  # Visibility in meters
    
    # Delay risk assessment
    delay_risk: Optional[str] = None  # "LOW", "MODERATE", "HIGH", "SEVERE"
    risk_reasoning: Optional[str] = None
    
    error: Optional[str] = None


# ========================================
# AGENT ADDRESSES
# ========================================

# Flight Historical Agent - provides comprehensive flight analysis
FLIGHT_HISTORICAL_AGENT = os.getenv("FLIGHT_HISTORICAL_AGENT")
if not FLIGHT_HISTORICAL_AGENT:
    raise ValueError("FLIGHT_HISTORICAL_AGENT must be set in .env file")

# Weather Agent (Agentverse) - provides weather data for airports
WEATHER_AGENT = os.getenv("WEATHER_AGENT")
if not WEATHER_AGENT:
    raise ValueError("WEATHER_AGENT must be set in .env file")

# Initialize the insurance recommendation agent with ASI-1 metadata
insurance_agent = Agent(
    name="TravelSure-Insurance-Advisor",
    seed="insurance_advisor_secure_seed_phrase_change_this",
    mailbox=True,
    port=8000,  # Use port 8001 to avoid conflict with Flight Historical Agent
)

# Add metadata for ASI-1 discoverability
insurance_agent.metadata = {
    "name": "TravelSure Insurance Advisor",
    "description": "AI-powered flight insurance recommendation agent using MeTTa knowledge graphs, historical flight data, and weather analysis to suggest optimal delay insurance thresholds",
    "tags": ["insurance", "flight", "travel", "risk-analysis", "metta", "ai", "weather", "delay-protection"],
    "version": "1.0.0",
    "author": "TravelSure Team",
    "capabilities": [
        "Flight insurance recommendations",
        "Historical flight data analysis",
        "Weather-aware risk assessment",
        "Multi-factor AI reasoning",
        "Time-threshold insurance options",
        "Smart contract integration"
    ],
    "protocols": ["chat", "insurance_recommendation"],
    "endpoints": {
        "chat": "Supports Agentverse chat protocol for natural language insurance queries",
        "insurance_api": "Direct protocol-based insurance recommendations"
    }
}

# Create protocols
insurance_protocol = Protocol("InsuranceRecommendation")

# Create chat protocol using the official spec from uagents_core
if CHAT_PROTOCOL_AVAILABLE:
    chat_protocol = Protocol(spec=chat_protocol_spec)
else:
    chat_protocol = None

# Initialize MeTTa knowledge graph
metta = None
insurance_rag = None

if METTA_AVAILABLE:
    try:
        metta = MeTTa()
        initialize_insurance_knowledge(metta)
        insurance_rag = InsuranceRAG(metta)
        print("🧠 MeTTa knowledge graph initialized")
    except Exception as e:
        print(f"⚠️ MeTTa initialization failed: {e}")
        METTA_AVAILABLE = False


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
    # CORRECT LOGIC: Lower threshold = Higher premium (more likely to claim)
    # Higher threshold = Lower premium (less likely to claim)
    
    # 2-HOUR THRESHOLD - HIGHEST premium (easiest to trigger = highest risk for insurer)
    delay_2h_premium = round(base_premium * 1.0 * (1 + delay_rate * 2.0), 2)
    options.append({
        "option_type": "delay_2h",
        "name": "2-Hour Threshold",
        "description": "Claim payout if delay exceeds 2 hours",
        "coverage_details": ["Payout via smart contract when delay > 2 hours"],
        "premium": delay_2h_premium,
        "recommended": delay_rate < 0.15  # Low delay risk - good for reliable flights
    })
    
    # 4-HOUR THRESHOLD - High premium
    delay_4h_premium = round(base_premium * 0.75 * (1 + delay_rate * 1.5), 2)
    options.append({
        "option_type": "delay_4h",
        "name": "4-Hour Threshold",
        "description": "Claim payout if delay exceeds 4 hours",
        "coverage_details": ["Payout via smart contract when delay > 4 hours"],
        "premium": delay_4h_premium,
        "recommended": delay_rate >= 0.15 and delay_rate < 0.25
    })
    
    # 6-HOUR THRESHOLD - Medium premium
    delay_6h_premium = round(base_premium * 0.55 * (1 + delay_rate * 1.2), 2)
    options.append({
        "option_type": "delay_6h",
        "name": "6-Hour Threshold",
        "description": "Claim payout if delay exceeds 6 hours",
        "coverage_details": ["Payout via smart contract when delay > 6 hours"],
        "premium": delay_6h_premium,
        "recommended": delay_rate >= 0.25 and delay_rate < 0.35
    })
    
    # 8-HOUR THRESHOLD - Lower premium (harder to trigger)
    delay_8h_premium = round(base_premium * 0.40 * (1 + delay_rate * 0.9), 2)
    options.append({
        "option_type": "delay_8h",
        "name": "8-Hour Threshold",
        "description": "Claim payout if delay exceeds 8 hours",
        "coverage_details": ["Payout via smart contract when delay > 8 hours"],
        "premium": delay_8h_premium,
        "recommended": delay_rate >= 0.35 and delay_rate < 0.5
    })
    
    # 12-HOUR THRESHOLD - LOWEST premium (hardest to trigger = lowest risk for insurer)
    delay_12h_premium = round(base_premium * 0.25 * (1 + delay_rate * 0.6), 2)
    options.append({
        "option_type": "delay_12h",
        "name": "12-Hour Threshold",
        "description": "Claim payout if delay exceeds 12 hours",
        "coverage_details": ["Payout via smart contract when delay > 12 hours"],
        "premium": delay_12h_premium,
        "recommended": delay_rate >= 0.5  # High delay risk
    })
    
    return options


def analyze_comprehensive_risk(flight_data: FlightHistoricalResponse, weather_data: Optional[dict] = None, use_metta: bool = True) -> dict:
    """
    Analyze flight data using comprehensive historical data, weather, and MeTTa reasoning
    
    Args:
        flight_data: FlightHistoricalResponse with complete analysis
        weather_data: Optional weather data dictionary
        use_metta: Whether to use MeTTa for enhanced reasoning
        
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
    
    # ========================================
    # ENHANCED METTA REASONING (Multi-factor analysis)
    # ========================================
    if use_metta and METTA_AVAILABLE and insurance_rag:
        try:
            # Prepare comprehensive data for MeTTa analysis
            metta_input = {
                'ontime_percent': ontime_percent,
                'origin_iata': flight_data.origin_iata,
                'destination_iata': flight_data.destination_iata,
                'date': flight_data.date,
                'cancelled_count': flight_data.cancelled_count if flight_data.cancelled_count else 0,
                'total_historical_flights': flight_data.total_historical_flights
            }
            
            # Add weather data if available
            if weather_data:
                # Pass weather condition even if not marked as fully successful
                condition = weather_data.get("condition")
                if condition:
                    metta_input['weather_condition'] = condition
                elif weather_data.get("success"):
                    # If marked successful but no condition, use 'clear' as default
                    metta_input['weather_condition'] = weather_data.get("condition", "clear")
            
            # Get comprehensive MeTTa recommendation with multi-factor reasoning
            metta_result = insurance_rag.get_comprehensive_recommendation(metta_input)
            
            # Use MeTTa's comprehensive analysis
            recommendation = metta_result.get('recommended_type', 'delay_4h')
            base_reasoning = metta_result.get('reasoning', '')
            confidence = metta_result.get('confidence', 0.80)
            
            # Use MeTTa's identified risk factors
            risk_factors.extend(metta_result.get('risk_factors', []))
            
            print(f"[MeTTa] Comprehensive analysis complete: {recommendation} (confidence: {confidence:.2f})")
            print(f"[MeTTa] Risk adjustments applied: {metta_result.get('risk_adjustments_applied', 0):.2f}")
                
        except Exception as e:
            print(f"MeTTa comprehensive reasoning failed, using fallback: {e}")
            import traceback
            traceback.print_exc()
            recommendation, base_reasoning = _fallback_recommendation(delay_rate, ontime_percent, delay_risk)
            confidence = 0.75
    else:
        # Fallback logic when MeTTa not available
        recommendation, base_reasoning = _fallback_recommendation(delay_rate, ontime_percent, delay_risk)
        confidence = 0.75
        
        # Manual risk factor building for fallback
        if delay_rate < 0.15:
            risk_factors.append(f"Excellent on-time record: {ontime_percent*100:.1f}%")
        elif delay_rate < 0.25:
            risk_factors.append(f"Good on-time rate: {ontime_percent*100:.1f}%")
            if flight_data.delayed_count:
                risk_factors.append(f"Past delays: {flight_data.delayed_count} recorded")
        else:
            risk_factors.append(f"Historical on-time rate: {ontime_percent*100:.1f}%")
            if flight_data.delayed_count:
                risk_factors.append(f"Delay history: {flight_data.delayed_count} delays")
        
        # Add weather manually if not using MeTTa
        if weather_data and weather_data.get("success"):
            weather_condition = weather_data.get("condition", "unknown")
            weather_risk = weather_data.get("delay_risk", "UNKNOWN")
            risk_factors.append(f"Weather: {weather_condition} ({weather_risk} risk)")
            
            if weather_risk in ["HIGH", "SEVERE"]:
                base_reasoning += f" Weather concerns ({weather_condition}) suggest additional coverage."
            elif weather_risk == "LOW":
                base_reasoning += f" Clear weather ({weather_condition}) reduces delay concerns."
    
    # Use the reasoning from MeTTa or fallback
    full_reasoning = base_reasoning
    # Use the reasoning from MeTTa or fallback
    full_reasoning = base_reasoning
    
    # ========================================
    # ADD ADDITIONAL CONTEXTUAL RISK FACTORS
    # ========================================
    
    # Add cancellation info if relevant
    if flight_data.cancelled_count and flight_data.cancelled_count > 0:
        if f"Cancellation history" not in str(risk_factors):  # Avoid duplicates from MeTTa
            risk_factors.append(f"Cancellation history: {flight_data.cancelled_count} cancellations recorded")
    
    # Add route information
    if flight_data.origin_city and flight_data.destination_city:
        if not any("Route:" in str(rf) for rf in risk_factors):  # Avoid duplicates
            risk_factors.append(f"Route: {flight_data.origin_city} → {flight_data.destination_city}")
    
    # Find the recommended option's premium
    recommended_option = next((opt for opt in insurance_options if opt["option_type"] == recommendation), None)
    estimated_premium = recommended_option["premium"] if recommended_option else base_premium
    
    return {
        "recommendation": recommendation,
        "confidence": confidence,
        "reasoning": full_reasoning,
        "risk_factors": risk_factors,
        "estimated_premium": estimated_premium,
        "risk_level": delay_risk,
        "route": f"{flight_data.origin_iata or 'UNK'} → {flight_data.destination_iata or 'UNK'}",
        "insurance_options": insurance_options
    }


def _fallback_recommendation(delay_rate: float, ontime_percent: float, delay_risk: str) -> tuple[str, str]:
    """Fallback recommendation logic when MeTTa is not available"""
    
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


def _fallback_recommendation(delay_rate: float, ontime_percent: float, delay_risk: str) -> tuple[str, str]:
    """Fallback recommendation logic when MeTTa is not available"""
    
    if delay_rate < 0.15:
        recommendation = "delay_2h"
        reasoning = f"Excellent {delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 2-hour threshold recommended."
    elif delay_rate < 0.25:
        recommendation = "delay_4h"
        reasoning = f"Good {delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 4-hour threshold recommended."
    elif delay_rate < 0.35:
        recommendation = "delay_6h"
        reasoning = f"{delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 6-hour threshold recommended."
    elif delay_rate < 0.5:
        recommendation = "delay_8h"
        reasoning = f"{delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 8-hour threshold recommended."
    else:
        recommendation = "delay_12h"
        reasoning = f"{delay_risk} risk with {ontime_percent*100:.1f}% on-time performance. 12-hour threshold recommended."
    
    return recommendation, reasoning


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


def format_recommendation_as_text(analysis: dict, airline: str, flight_number: str, date: str, flight_data: FlightHistoricalResponse = None, weather_data: dict = None) -> str:
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
❌ Cancellations: {flight_data.cancelled_count}

"""
    
    # Add weather information
    response += "**Weather Conditions:**\n"
    if weather_data and weather_data.get('success'):
        weather_emoji = {
            'clear': '☀️',
            'clouds': '☁️',
            'rain': '🌧️',
            'snow': '❄️',
            'thunderstorm': '⛈️',
            'fog': '🌫️',
            'mist': '🌫️'
        }
        
        condition = weather_data.get('condition', 'unknown')
        w_emoji = weather_emoji.get(condition.lower(), '🌤️')
        temp = weather_data.get('temperature')
        delay_risk = weather_data.get('delay_risk', 'UNKNOWN')
        description = weather_data.get('description', 'N/A')
        
        # Risk level emoji
        risk_emoji = {
            'LOW': '✅',
            'MODERATE': '⚠️',
            'HIGH': '🔴',
            'SEVERE': '🚨'
        }
        r_emoji = risk_emoji.get(delay_risk, '❓')
        
        response += f"""{w_emoji} Current: {description.title() if description else 'N/A'}
"""
        if temp is not None:
            response += f"""🌡️ Temperature: {temp:.1f}°C ({temp * 9/5 + 32:.1f}°F)
"""
        response += f"""{r_emoji} Weather Delay Risk: {delay_risk}
"""
        
        if weather_data.get('risk_reasoning'):
            response += f"""💡 {weather_data['risk_reasoning']}
"""
    else:
        # Show whatever weather data we have, even if not fully successful
        if weather_data:
            condition = weather_data.get('condition')
            temp = weather_data.get('temperature')
            delay_risk = weather_data.get('delay_risk')
            
            if condition or temp or delay_risk:
                # We have partial data, show it
                response += "🌤️ **Weather Status:**\n"
                
                if condition:
                    weather_emoji_fallback = {
                        'clear': '☀️',
                        'clouds': '☁️',
                        'rain': '🌧️',
                        'snow': '❄️',
                        'thunderstorm': '⛈️',
                        'fog': '🌫️',
                        'mist': '🌫️'
                    }
                    w_emoji = weather_emoji_fallback.get(condition.lower(), '🌤️')
                    response += f"{w_emoji} Condition: {condition.title()}\n"
                
                if temp is not None:
                    response += f"🌡️ Temperature: {temp:.1f}°C ({temp * 9/5 + 32:.1f}°F)\n"
                
                if delay_risk:
                    risk_emoji_fallback = {'LOW': '✅', 'MODERATE': '⚠️', 'HIGH': '🔴', 'SEVERE': '🚨'}
                    r_emoji = risk_emoji_fallback.get(delay_risk, '❓')
                    response += f"{r_emoji} Weather Delay Risk: {delay_risk}\n"
            else:
                # No usable data at all
                response += "🌤️ Weather data: Real-time conditions being checked...\n"
                response += "📡 Weather Agent integration active\n"
        else:
            # No weather data object at all
            response += "🌤️ Weather data: Real-time conditions being checked...\n"
            response += "📡 Weather Agent integration active\n"
    
    response += "\n"
    
    response += f"""**Our Recommendation:** {analysis['recommendation'].replace('_', ' ').title()}
**Confidence:** {analysis['confidence'] * 100:.0f}%

"""
    
    # Format the reasoning - split by newlines and display each point
    reasoning_text = analysis['reasoning']
    if '🔍' in reasoning_text:
        # MeTTa provided detailed multi-factor reasoning - show it beautifully
        response += "**🧠 AI Multi-Factor Analysis:**\n"
        reasoning_lines = reasoning_text.split('\n')
        for line in reasoning_lines:
            line = line.strip()
            if line:
                # Each line is already formatted with emoji from MeTTa
                response += f"{line}\n"
        
        # Add final recommendation summary
        response += "\n**💡 Final Recommendation:**\n\n"
        response += f"Based on comprehensive AI analysis of {analysis.get('risk_factors', []).__len__()} risk factors, we recommend **{analysis['recommendation'].replace('_', '-').upper()}** insurance coverage with **{analysis['confidence'] * 100:.0f}%** confidence.**\n"
    else:
        # Simple reasoning without multi-factor breakdown
        response += "**📊 Analysis:**\n"
        response += f"{reasoning_text}\n"
    
    response += "\n**⚠️ Identified Risk Factors:**\n"
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
    response += "🌐 **[Visit travelsure.vercel.app to purchase insurance](https://travelsure.vercel.app)**\n\n"
    response += "⚡ Smart contract powered • Instant payouts • No paperwork\n\n"
    response += "💎 **Bonus: Stake & Earn!**\n\n"
    response += "Stake your funds on TravelSure to:\n\n"
    response += "• Earn competitive yields on your staked amount\n\n"
    response += "• Get FREE cancellation insurance automatically\n\n"
    response += "• Support the insurance pool and earn rewards\n\n"
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

I analyze flights using real-time data, historical performance, and AI-powered knowledge graphs to recommend the best insurance coverage!

**How to use:**
Tell me your flight number and date:
• "Check flight AA100 on 2025-10-20"
• "I have UA890 tomorrow"
• "Analyze BA001 today"

**Multi-Factor AI Analysis:**
✈️ Real-time flight schedules
📊 Historical on-time performance (76+ flights)
⚠️ Delay and cancellation rates
�️ Weather conditions and impact
🏢 Airport congestion factors
📅 Seasonal delay patterns
🧠 MeTTa knowledge graph reasoning

**Time-Based Insurance Options:**
⏰ 2-Hour Threshold (Reliable flights)
⏱️ 4-Hour Threshold (Good reliability)
⏲️ 6-Hour Threshold (Moderate delays)
🕐 8-Hour Threshold (Frequent delays)
🕛 12-Hour Threshold (Very delayed flights)

💡 AI analyzes ALL factors to recommend optimal threshold
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

2. **AI performs comprehensive analysis** - Multi-factor reasoning:
   • Real-time schedule from FlightDelay API
   • Historical performance statistics (76+ flights)
   • Weather conditions and delay impact
   • Airport congestion factors (JFK, ORD, ATL, LAX, LHR, EWR)
   • Seasonal delay patterns (winter storms, summer traffic, holidays)
   • Cancellation history
   • 🧠 MeTTa knowledge graph processes ALL factors

3. **Get AI-optimized recommendations** with time-threshold options:
   ⏰ **2-Hour Threshold** - Best for reliable flights (85%+ on-time)
   ⏱️ **4-Hour Threshold** - Good for consistent flights (75-85% on-time)
   ⏲️ **6-Hour Threshold** - Moderate delay protection (65-75% on-time)
   🕐 **8-Hour Threshold** - For frequently delayed flights (50-65% on-time)
   🕛 **12-Hour Threshold** - Extreme delay coverage (<50% on-time)

**How AI Adjusts Recommendations:**
• Severe weather (thunderstorms, snow, fog) → Higher threshold
• Congested airports → Risk adjustment applied
• Winter/Holiday season → Additional coverage recommended
• Cancellation history → Upgraded protection
• Multiple risk factors → Intelligent threshold upgrade

**Smart Contract Execution:**
• AI recommends threshold based on comprehensive analysis
• Pay premium via smart contract on travelsure.vercel.app
• If delay exceeds threshold, claim payout instantly
• No paperwork, automated execution

**💎 Bonus Feature - Stake & Earn:**
• Stake funds on travelsure.vercel.app
• Earn yields on your staked amount
• Get FREE cancellation insurance
• Support the insurance pool

**Example:**
"I need insurance for flight AA100 on 2025-10-25"

Ready to analyze your flight with multi-factor AI reasoning!"""
                
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
                processing_text = f"""🔍 Analyzing flight {airline}{flight_number} on {date}...

**Fetching comprehensive data:**
• ✈️ Schedule information
• 📊 Historical performance (76+ flights)
• ⚠️ Risk assessment
• 🌤️ Real-time weather conditions
• 🧠 MeTTa AI multi-factor reasoning
• 🏢 Airport congestion analysis
• 📅 Seasonal risk factors

Please wait..."""
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
# WEATHER AGENT RESPONSE HANDLER
# ========================================

@insurance_agent.on_message(model=WeatherResponse)
async def handle_weather_data(ctx: Context, sender: str, msg: WeatherResponse):
    """Handle weather data from Weather Agent"""
    ctx.logger.info(f"[WEATHER] Received weather data for: {msg.airport_code}")
    
    try:
        # Store weather data temporarily
        ctx.storage.set(f"weather_{msg.airport_code}", {
            "success": msg.success,
            "condition": msg.condition,
            "temperature": msg.temperature,
            "delay_risk": msg.delay_risk,
            "risk_reasoning": msg.risk_reasoning,
            "description": msg.description
        })
        
        if msg.success:
            ctx.logger.info(f"✅ Weather: {msg.condition}, Risk: {msg.delay_risk}")
        else:
            ctx.logger.warning(f"⚠️ Weather fetch error: {msg.error}")
            
    except Exception as e:
        ctx.logger.error(f"Error processing weather data: {e}")


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
        
        # ========================================
        # REQUEST WEATHER DATA FOR BOTH AIRPORTS
        # ========================================
        weather_data_origin = None
        weather_data_dest = None
        
        if msg.origin_iata:
            ctx.logger.info(f"Requesting weather for origin: {msg.origin_iata}")
            await ctx.send(
                WEATHER_AGENT,
                WeatherRequest(
                    airport_code=msg.origin_iata,
                    city=msg.origin_city
                )
            )
            # Wait a bit for weather response
            await asyncio.sleep(2)
            weather_data_origin = ctx.storage.get(f"weather_{msg.origin_iata}")
        
        if msg.destination_iata:
            ctx.logger.info(f"Requesting weather for destination: {msg.destination_iata}")
            await ctx.send(
                WEATHER_AGENT,
                WeatherRequest(
                    airport_code=msg.destination_iata,
                    city=msg.destination_city
                )
            )
            # Wait a bit for weather response
            await asyncio.sleep(2)
            weather_data_dest = ctx.storage.get(f"weather_{msg.destination_iata}")
        
        # Use worst-case weather data for analysis
        weather_data = weather_data_dest if weather_data_dest else weather_data_origin
        
        # Log weather data status
        if weather_data:
            ctx.logger.info(f"✅ Weather data retrieved: {weather_data.get('condition')} at destination/origin")
            ctx.logger.info(f"   Weather delay risk: {weather_data.get('delay_risk')}")
            if weather_data.get('temperature'):
                ctx.logger.info(f"   Temperature: {weather_data.get('temperature'):.1f}°C")
        else:
            ctx.logger.warning(f"⚠️ No weather data available for route")
        
        # Analyze the comprehensive data with weather
        ctx.logger.info(f"Analyzing comprehensive data: Risk={msg.delay_risk}, On-time={msg.ontime_percent}")
        if weather_data:
            ctx.logger.info(f"Weather considered: {weather_data.get('condition')} ({weather_data.get('delay_risk')})")
        
        analysis = analyze_comprehensive_risk(msg, weather_data=weather_data, use_metta=METTA_AVAILABLE)
        
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
            
            response_text = format_recommendation_as_text(analysis, airline, flight_number, date, msg, weather_data)
            
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
print("TravelSure Insurance Advisor Agent - ENHANCED WITH METTA")
print("="*70)
print(f"Agent Address: {insurance_agent.address}")
print(f"Port: 8000")
print(f"Chat Protocol: {chat_status}")
print(f"Connected to Flight Historical Agent: {FLIGHT_HISTORICAL_AGENT}")
print(f"Connected to Weather Agent: {WEATHER_AGENT}")
print(f"\nEnhanced Features:")
print(f"  ✅ Multi-factor AI analysis")
print(f"  ✅ Real-time schedule + historical performance")
print(f"  ✅ Weather-aware recommendations")
print(f"  ✅ Airport congestion analysis")
print(f"  ✅ Seasonal risk pattern detection")
print(f"  ✅ MeTTa knowledge graph reasoning")
print(f"  ✅ Intelligent threshold recommendations")
print(f"  ✅ Risk adjustment calculations")
print(f"  ✅ Agentverse chat interface")
print("="*70)

if __name__ == "__main__":
    insurance_agent.run()
