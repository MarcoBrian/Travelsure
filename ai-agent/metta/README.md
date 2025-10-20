# MeTTa Integration for TravelSure Flight Insurance

This directory contains the **SingularityNET MeTTa** knowledge graph integration for TravelSure's intelligent flight insurance system.

## 🤖 What is MeTTa?

**MeTTa** (Meta Type Talk) is a multi-paradigm language for declarative and functional computations over knowledge graphs developed by SingularityNET. It provides:

- **Structured Knowledge Representation**: Organize insurance domain knowledge in logical, queryable formats
- **Symbolic Reasoning**: Perform complex logical operations and pattern matching
- **Knowledge Graph Operations**: Build, query, and manipulate insurance knowledge

## 🏗️ Architecture

```
metta/
├── __init__.py           # Module exports
├── knowledge.py          # Insurance domain knowledge graph
├── insurance_rag.py      # RAG query system
├── utils.py              # LLM integration & query processing
├── test.py               # Test suite
└── README.md             # This file
```

## 📚 Components

### 1. **knowledge.py** - Knowledge Graph

Comprehensive flight insurance domain knowledge including:

- **Insurance Types**: 2h, 4h, 6h, 8h, 12h delay thresholds + cancellation
- **Risk Factors**: Weather, airline reliability, airport congestion, seasonal patterns
- **Airlines**: Premium, major, budget, regional airline characteristics
- **Smart Contracts**: Automated payouts, transparency, PYUSD payments
- **Staking**: Yield earning, free cancellation, pool rewards
- **FAQs**: Common questions about insurance, premiums, payouts, staking

### 2. **insurance_rag.py** - RAG System

Retrieval-Augmented Generation system with query methods:

```python
from metta import InsuranceRAG

rag = InsuranceRAG(metta_instance)

# Get insurance type details
details = rag.get_insurance_type_details("delay_4h")

# Get recommendation based on flight performance
recommendation = rag.get_recommendation_by_ontime_rate(0.78)

# Query risk factors
risks = rag.query_risk_factors()

# Check weather impact
weather_impact = rag.get_weather_impact("thunderstorms")

# Check airport congestion
is_congested = rag.is_congested_airport("JFK")

# Query FAQ
answer = rag.query_faq("How does insurance work?")
```

### 3. **utils.py** - LLM Integration

ASI:One API integration for natural language processing:

```python
from metta import LLM, process_insurance_query

# Initialize LLM (requires ASI_ONE_API_KEY)
llm = LLM(model="asi1-mini")

# Process user query with MeTTa reasoning
response = await process_insurance_query(
    query="I need insurance for flight AA100",
    rag=rag,
    llm=llm,
    flight_data=flight_data
)
```

**Intent Classification:**

- `flight_inquiry` - Specific flight questions
- `insurance_recommendation` - Insurance advice requests
- `faq` - General how-to questions
- `premium_question` - Pricing inquiries
- `staking_question` - Staking benefits
- `threshold_question` - Delay threshold info
- `weather_inquiry` - Weather impact questions

### 4. **test.py** - Test Suite

Comprehensive tests for all MeTTa functionality:

```bash
cd ai-agent/metta
python test.py
```

Tests cover:

- ✅ Knowledge graph initialization
- ✅ Insurance type queries
- ✅ Recommendation system
- ✅ Risk factor analysis
- ✅ Weather impact
- ✅ Airport congestion
- ✅ FAQ queries
- ✅ Smart contract features
- ✅ Staking benefits
- ✅ Dynamic knowledge addition

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r ../requirements.txt
```

This installs:

- `hyperon>=0.1.12` - MeTTa Python library
- `uagents>=0.20.1` - Fetch.ai agent framework
- `aiohttp>=3.9.0` - Async HTTP client
- `python-dotenv>=1.0.0` - Environment variables

### 2. Set Up API Keys (Optional)

Create `.env` file in `ai-agent/` directory:

```env
# ASI:One API Key (for LLM features)
# Get yours from: https://asi1.ai/
ASI_ONE_API_KEY=your_asi_one_api_key_here

# OpenWeatherMap API Key (for weather agent)
# Get yours from: https://openweathermap.org/api
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

**Note:** MeTTa knowledge graph works without API keys. LLM features require ASI_ONE_API_KEY.

### 3. Test the Integration

```bash
cd ai-agent/metta
python test.py
```

Expected output:

```
🧪 TRAVELSURE METTA INTEGRATION TESTS
============================
TEST 1: Knowledge Graph Initialization
✅ Knowledge graph initialized successfully
...
✅ ALL TESTS PASSED!
```

### 4. Use in Your Agent

```python
from hyperon import MeTTa
from metta import initialize_insurance_knowledge, InsuranceRAG, process_insurance_query

# Initialize MeTTa
metta = MeTTa()
initialize_insurance_knowledge(metta)
rag = InsuranceRAG(metta)

# Get recommendation for a flight
recommendation = rag.get_recommendation_by_ontime_rate(ontime_percent=0.82)
print(f"Recommended: {recommendation['recommended_type']}")
print(f"Risk Level: {recommendation['risk_level']}")

# Process natural language query
response = await process_insurance_query(
    query="What insurance should I get for my flight?",
    rag=rag,
    flight_data=flight_data
)
print(response)
```

## 🎯 Integration with Insurance Agent

The MeTTa integration enhances the existing `insurance_agent_chat.py` by:

1. **Validating Recommendations**: Cross-check AI recommendations with structured knowledge
2. **Explainable Reasoning**: Provide clear explanations based on knowledge graph
3. **Handling Edge Cases**: Use rule-based logic for unusual scenarios
4. **FAQ Support**: Answer common questions with structured responses
5. **Risk Assessment**: Validate risk scores using multiple knowledge sources

## 🔧 Knowledge Graph Structure

### Insurance Type Relationships

```metta
(insurance_type delay_2h "2-hour threshold")
(best_for delay_2h "highly reliable flights with on-time rate > 85%")
(premium_multiplier delay_2h "0.3")
(description delay_2h "Quick coverage for any unexpected delay")
(payout_trigger delay_2h "delay exceeds 2 hours")
```

### Risk Factor Relationships

```metta
(risk_factor low_ontime_rate "high delay risk")
(risk_factor bad_weather "weather delay risk")
(risk_factor congested_airport "airport delay risk")
```

### Weather Impact Relationships

```metta
(weather_condition thunderstorms "high delay risk, consider 6h+ threshold")
(weather_condition snow "very high delay risk, consider 8h+ threshold")
(weather_condition clear "low weather delay risk")
```

### Recommendation Logic

```metta
(risk_level excellent "on-time rate > 85%, recommend 2h threshold")
(risk_level good "on-time rate 75-85%, recommend 4h threshold")
(risk_level moderate "on-time rate 65-75%, recommend 6h threshold")
(risk_level poor "on-time rate 50-65%, recommend 8h threshold")
(risk_level very_poor "on-time rate < 50%, recommend 12h threshold")
```

## 📊 Example Queries

### Query Insurance Types

```python
# Get all insurance types
types = rag.get_all_insurance_types()
# Returns: [('delay_2h', '2-hour threshold'), ('delay_4h', '4-hour threshold'), ...]

# Get specific type details
details = rag.get_insurance_type_details("delay_6h")
# Returns: {
#   'type': 'delay_6h',
#   'best_for': ['moderately delayed flights with on-time rate 65-75%'],
#   'premium_multiplier': ['0.5'],
#   'description': ['Protection for significant delays...'],
#   'payout_trigger': ['delay exceeds 6 hours']
# }
```

### Get Recommendations

```python
# Based on flight on-time performance
rec = rag.get_recommendation_by_ontime_rate(0.72)
# Returns: {
#   'risk_level': 'moderate',
#   'recommended_type': 'delay_6h',
#   'ontime_percent': 0.72,
#   'recommendation_text': ['For flights with 65-75% on-time rate...']
# }
```

### Query Risk Factors

```python
# Get all risk factors
risks = rag.query_risk_factors()

# Get specific risk factor
weather_risk = rag.query_risk_factors("bad_weather")
# Returns: ['weather delay risk']
```

### Check Weather & Airports

```python
# Weather impact
impact = rag.get_weather_impact("snow")
# Returns: ['very high delay risk, consider 8h+ threshold']

# Airport congestion
is_busy = rag.is_congested_airport("JFK")
# Returns: True
```

### Query FAQs

```python
# Exact match
answer = rag.query_faq("How does insurance work?")

# Partial match
answer = rag.query_faq("staking")
# Returns FAQ about staking benefits
```

## 🧠 MeTTa Pattern Matching

MeTTa uses pattern matching with variables:

```metta
# Query pattern: Find $x where (best_for delay_2h $x)
!(match &self (best_for delay_2h $x) $x)

# Returns: ["highly reliable flights with on-time rate > 85%"]
```

**Key Concepts:**

- `&self` - References current space
- `$variable` - Pattern matching variable
- `!(match ...)` - Query syntax
- `E(S(...), S(...), ...)` - Expression creation in Python

## 🔗 Integration with Other Agents

### With Flight Historical Agent

```python
# Get flight data
flight_data = await ctx.send_and_receive(
    FLIGHT_HISTORICAL_AGENT,
    FlightHistoricalRequest(airline="AA", flight_number="100", date="2025-10-20")
)

# Get MeTTa recommendation
rec = rag.get_recommendation_by_ontime_rate(flight_data.ontime_percent)
```

### With Weather Agent

```python
# Get weather data
weather_data = await ctx.send_and_receive(
    WEATHER_AGENT,
    WeatherRequest(airport_code="JFK")
)

# Check weather impact in knowledge graph
impact = rag.get_weather_impact(weather_data.condition)
```

## 🎨 Customization

### Adding New Knowledge

```python
# Add custom risk factor
rag.add_knowledge("risk_factor", "pandemic", "travel restrictions")

# Add custom FAQ
rag.add_knowledge("faq", "What is PYUSD?", "PYUSD is a stablecoin...")

# Add custom weather condition
rag.add_knowledge("weather_condition", "hurricane", "extreme delay risk")
```

### Extending the Knowledge Graph

Edit `knowledge.py` and add new atoms:

```python
# Add new insurance type
metta.space().add_atom(E(S("insurance_type"), S("delay_24h"), S("24-hour threshold")))
metta.space().add_atom(E(S("best_for"), S("delay_24h"), ValueAtom("extreme weather routes")))

# Add new airline
metta.space().add_atom(E(S("airline_category"), S("ultra_premium"), ValueAtom("Private jets")))
```

## 📖 Resources

- [MeTTa Documentation](https://metta-lang.dev/docs/learn/tutorials/python_use/metta_python_basics.html)
- [Fetch.ai uAgents](https://innovationlab.fetch.ai/resources/docs/examples/chat-protocol/asi-compatible-uagents)
- [Agentverse](https://agentverse.ai/)
- [ASI:One](https://asi1.ai/)
- [SingularityNET](https://singularitynet.io/)

## 🤝 Contributing

To extend the MeTTa integration:

1. Add knowledge to `knowledge.py`
2. Add query methods to `insurance_rag.py`
3. Update tests in `test.py`
4. Document changes in this README

## 🐛 Troubleshooting

### Import Error: No module named 'hyperon'

```bash
pip install hyperon
```

### MeTTa Query Returns Empty

Check that knowledge is initialized:

```python
initialize_insurance_knowledge(metta)
```

### LLM Not Working

Verify ASI_ONE_API_KEY is set:

```bash
echo $ASI_ONE_API_KEY
```

Get API key from: https://asi1.ai/

## 📝 License

Part of TravelSure project - MIT License
