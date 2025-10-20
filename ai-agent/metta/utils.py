# utils.py
import os
import re
from typing import Dict, Tuple, Optional
from dotenv import load_dotenv

load_dotenv()

class LLM:
    """
    LLM integration for TravelSure insurance agent.
    Supports ASI:One API (OpenAI-compatible) for natural language processing.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "asi1-mini"):
        """
        Initialize LLM with ASI:One API.
        
        Args:
            api_key: ASI:One API key (or use ASI_ONE_API_KEY env var)
            model: Model to use (asi1-mini, asi1-fast, asi1-extended, asi1-agentic)
        """
        self.api_key = api_key or os.getenv("ASI_ONE_API_KEY", "")
        self.model = model
        self.base_url = "https://api.asi1.ai/v1"
        
        if not self.api_key:
            print("[LLM] ⚠️  ASI:One API key not configured")
            print("[LLM]    Get your key from: https://asi1.ai/")
            print("[LLM]    Set ASI_ONE_API_KEY in .env file")
    
    async def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        """
        Generate a response using ASI:One API.
        
        Args:
            prompt: User prompt
            system_prompt: System instructions
            
        Returns:
            Generated response text
        """
        if not self.api_key:
            return "LLM not configured. Please set ASI_ONE_API_KEY."
        
        try:
            import aiohttp
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    json=data,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result["choices"][0]["message"]["content"]
                    else:
                        error_text = await response.text()
                        print(f"[LLM] API Error: {response.status} - {error_text}")
                        return f"Error: Unable to generate response (status {response.status})"
                        
        except Exception as e:
            print(f"[LLM] Exception: {e}")
            return f"Error: {str(e)}"


def get_intent_and_keyword(query: str, llm: LLM = None) -> Tuple[str, str]:
    """
    Extract intent and keywords from a user query.
    Uses simple pattern matching with fallback to LLM if available.
    
    Args:
        query: User query text
        llm: Optional LLM instance for advanced intent detection
        
    Returns:
        Tuple of (intent, keyword)
        
    Intents:
        - flight_inquiry: User asking about a specific flight
        - insurance_recommendation: User wants insurance advice
        - faq: General question about how insurance works
        - premium_question: Question about pricing
        - staking_question: Question about staking
        - threshold_question: Question about delay thresholds
        - weather_inquiry: Question about weather impact
        - general: General conversation
    """
    query_lower = query.lower()
    
    # Flight number patterns
    flight_pattern = r'\b([A-Z]{2})\s*(\d{1,4})\b'
    flight_match = re.search(flight_pattern, query, re.IGNORECASE)
    
    # FAQ patterns
    faq_keywords = ["how does", "what is", "explain", "tell me about", "how do i", 
                   "what are", "can i", "is it", "why"]
    
    # Staking patterns
    staking_keywords = ["staking", "stake", "yield", "earn", "free cancellation"]
    
    # Premium/pricing patterns
    premium_keywords = ["premium", "cost", "price", "how much", "expensive", "cheap"]
    
    # Threshold patterns
    threshold_keywords = ["threshold", "2 hour", "4 hour", "6 hour", "8 hour", "12 hour",
                         "2h", "4h", "6h", "8h", "12h"]
    
    # Weather patterns
    weather_keywords = ["weather", "storm", "snow", "rain", "fog", "conditions"]
    
    # Flight inquiry
    if flight_match or any(word in query_lower for word in ["flight", "airline", "route"]):
        if flight_match:
            keyword = f"{flight_match.group(1)}{flight_match.group(2)}"
            return ("flight_inquiry", keyword)
        return ("flight_inquiry", query_lower)
    
    # Staking inquiry
    if any(keyword in query_lower for keyword in staking_keywords):
        return ("staking_question", query_lower)
    
    # Premium inquiry
    if any(keyword in query_lower for keyword in premium_keywords):
        return ("premium_question", query_lower)
    
    # Threshold inquiry
    if any(keyword in query_lower for keyword in threshold_keywords):
        return ("threshold_question", query_lower)
    
    # Weather inquiry
    if any(keyword in query_lower for keyword in weather_keywords):
        return ("weather_inquiry", query_lower)
    
    # FAQ inquiry
    if any(keyword in query_lower for keyword in faq_keywords):
        return ("faq", query_lower)
    
    # Insurance recommendation
    if any(word in query_lower for word in ["insurance", "recommend", "suggest", "advice", 
                                            "should i", "need", "protection", "coverage"]):
        return ("insurance_recommendation", query_lower)
    
    # Default
    return ("general", query_lower)


async def process_insurance_query(query: str, rag, llm: Optional[LLM] = None, 
                                  flight_data: Dict = None) -> str:
    """
    Process a user query about insurance using MeTTa RAG and optional LLM.
    
    Args:
        query: User query text
        rag: InsuranceRAG instance with loaded knowledge
        llm: Optional LLM instance for natural language generation
        flight_data: Optional flight data dictionary
        
    Returns:
        Response text
    """
    intent, keyword = get_intent_and_keyword(query, llm)
    
    print(f"[Query Processor] Intent: {intent}, Keyword: {keyword}")
    
    # Handle different intents
    if intent == "faq":
        # Query FAQ knowledge
        answers = rag.query_faq(keyword)
        if answers:
            return f"**Answer:** {answers[0]}"
        return "I don't have information about that. Try asking about: how insurance works, thresholds, premiums, payouts, staking, or coverage."
    
    elif intent == "staking_question":
        # Get staking benefits from knowledge graph
        benefits = rag.get_staking_benefits()
        if benefits:
            response = "**Staking Benefits on TravelSure:**\n\n"
            for benefit in benefits[:5]:  # Limit to top 5
                response += f"• {benefit}\n"
            response += "\n💎 **Visit travelsure.vercel.app to start staking!**"
            return response
        return "Stake funds on travelsure.vercel.app to earn yields, get FREE cancellation insurance, and support the insurance pool!"
    
    elif intent == "premium_question":
        # Get premium calculation factors
        factors = rag.get_premium_factors()
        response = "**Insurance Premium Calculation:**\n\n"
        response += "Premiums are calculated based on:\n"
        for factor in factors[:5]:
            response += f"• {factor}\n"
        response += "\n✈️ Ask me about a specific flight to get exact pricing!"
        return response
    
    elif intent == "threshold_question":
        # Get all insurance types
        types = rag.get_all_insurance_types()
        response = "**Available Insurance Thresholds:**\n\n"
        
        # Get details for each type
        for insurance_type in ["delay_2h", "delay_4h", "delay_6h", "delay_8h", "delay_12h"]:
            details = rag.get_insurance_type_details(insurance_type)
            if details:
                best_for = details.get("best_for", [""])[0]
                desc = details.get("description", [""])[0]
                response += f"**{insurance_type.replace('_', ' ').title()}**\n"
                response += f"  Best for: {best_for}\n"
                response += f"  Coverage: {desc}\n\n"
        
        return response
    
    elif intent == "insurance_recommendation" and flight_data:
        # Use flight data to make recommendation
        ontime_percent = flight_data.get("ontime_percent", 0.5)
        recommendation = rag.get_recommendation_by_ontime_rate(ontime_percent)
        
        response = f"**Recommendation for your flight:**\n\n"
        response += f"✅ **Risk Level:** {recommendation['risk_level'].title()}\n"
        response += f"📊 **On-time Performance:** {ontime_percent*100:.1f}%\n"
        response += f"🎯 **Recommended:** {recommendation['recommended_type'].replace('_', ' ').title()}\n\n"
        
        if recommendation['recommendation_text']:
            response += f"💡 {recommendation['recommendation_text'][0]}\n\n"
        
        response += "🌐 **Purchase at:** travelsure.vercel.app"
        return response
    
    elif intent == "weather_inquiry":
        response = "**Weather Impact on Flight Delays:**\n\n"
        
        # Get weather impacts
        conditions = ["thunderstorms", "snow", "fog", "rain", "clear"]
        for condition in conditions:
            impact = rag.get_weather_impact(condition)
            if impact:
                response += f"• **{condition.title()}:** {impact[0]}\n"
        
        response += "\n🌤️ Weather data is fetched real-time for your flight's route!"
        return response
    
    elif intent == "general":
        # Smart contract or general info
        if "smart contract" in keyword or "blockchain" in keyword:
            features = rag.get_smart_contract_features()
            response = "**Smart Contract Features:**\n\n"
            for feature in features[:5]:
                response += f"• {feature}\n"
            return response
        
        # Use LLM for general conversation if available
        if llm and llm.api_key:
            system_prompt = """You are a helpful flight insurance assistant for TravelSure. 
            Be friendly, concise, and guide users to ask about specific flights or insurance options.
            Mention that insurance is handled via smart contracts and available at travelsure.vercel.app."""
            
            response = await llm.generate_response(query, system_prompt)
            return response
        
        return """👋 **Welcome to TravelSure!**

I can help you with:
• ✈️ Flight insurance recommendations
• 📊 Risk analysis for specific flights  
• 💰 Premium calculations
• 🎯 Threshold explanations (2h, 4h, 6h, 8h, 12h)
• 💎 Staking benefits
• 🌤️ Weather impact on delays

**Ask me about a specific flight!** Example: "I need insurance for flight AA100" """
    
    return "I'm here to help with flight insurance! Ask me about a specific flight or insurance options."
