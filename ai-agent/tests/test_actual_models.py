"""
Test to import actual models from both files and check digests
"""
import sys
sys.path.insert(0, '/Users/ansh/Documents/hackathons/travelsure-eth-global/Travelsure/ai-agent')
sys.path.insert(0, '/Users/ansh/Documents/hackathons/travelsure-eth-global/Travelsure/ai-agent/flight-data-agent')

# Import from actual files
from flight_agent import FlightDetailsResponse as FlightAgentResponse
from insurance_agent_chat import FlightDetailsResponse as InsuranceAgentResponse

# Create instances
flight_instance = FlightAgentResponse(
    flight_number="TEST123",
    departure_time="2025-10-17T12:00:00Z",
    arrival_time="2025-10-17T15:00:00Z",
    airline="Test",
    origin="JFK",
    destination="LAX",
    status="On Time"
)

insurance_instance = InsuranceAgentResponse(
    flight_number="TEST123",
    departure_time="2025-10-17T12:00:00Z",
    arrival_time="2025-10-17T15:00:00Z",
    airline="Test",
    origin="JFK",
    destination="LAX",
    status="On Time"
)

print("Flight Agent Model:")
print(f"  Schema Digest: {FlightAgentResponse.build_schema_digest(flight_instance)}")
print(f"  Type: {type(FlightAgentResponse)}")
print(f"  Module: {FlightAgentResponse.__module__}")
print(f"  Docstring: {repr(FlightAgentResponse.__doc__)}")

print("\nInsurance Agent Model:")
print(f"  Schema Digest: {InsuranceAgentResponse.build_schema_digest(insurance_instance)}")
print(f"  Type: {type(InsuranceAgentResponse)}")
print(f"  Module: {InsuranceAgentResponse.__module__}")
print(f"  Docstring: {repr(InsuranceAgentResponse.__doc__)}")

flight_digest = FlightAgentResponse.build_schema_digest(flight_instance)
insurance_digest = InsuranceAgentResponse.build_schema_digest(insurance_instance)

print(f"\nDo they match? {flight_digest == insurance_digest}")

if flight_digest != insurance_digest:
    print("\n⚠️ MODEL MISMATCH!")
    print("Even after importing from actual files, digests don't match.")
    print("\nChecking field details:")
    
    for field_name in FlightAgentResponse.__fields__:
        flight_field = FlightAgentResponse.__fields__[field_name]
        insurance_field = InsuranceAgentResponse.__fields__[field_name]
        print(f"\n  {field_name}:")
        print(f"    Flight: {flight_field.type_}, required={flight_field.required}")
        print(f"    Insurance: {insurance_field.type_}, required={insurance_field.required}")
        if flight_field != insurance_field:
            print(f"    ❌ MISMATCH!")
else:
    print("\n✅ Models match perfectly!")
