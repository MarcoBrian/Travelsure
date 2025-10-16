"""
Test script to verify FlightDetailsResponse model digests match
"""
from uagents import Model

# Insurance Agent's model (NOW MATCHING!)
class FlightDetailsResponseInsurance(Model):
    """Response model with flight details"""
    flight_number: str
    departure_time: str
    arrival_time: str
    airline: str
    origin: str
    destination: str
    status: str


# Flight Agent's model
class FlightDetailsResponseFlight(Model):
    """Response model with flight details"""
    flight_number: str
    departure_time: str
    arrival_time: str
    airline: str
    origin: str
    destination: str
    status: str


insurance_instance = FlightDetailsResponseInsurance(
    flight_number="TEST123",
    departure_time="2025-10-17T12:00:00Z",
    arrival_time="2025-10-17T15:00:00Z",
    airline="Test",
    origin="JFK",
    destination="LAX",
    status="On Time"
)

flight_instance = FlightDetailsResponseFlight(
    flight_number="TEST123",
    departure_time="2025-10-17T12:00:00Z",
    arrival_time="2025-10-17T15:00:00Z",
    airline="Test",
    origin="JFK",
    destination="LAX",
    status="On Time"
)

print("Insurance Agent Model:")
print(f"  Schema Digest: {FlightDetailsResponseInsurance.build_schema_digest(insurance_instance)}")
print(f"  Fields: {list(FlightDetailsResponseInsurance.__fields__.keys())}")

print("\nFlight Agent Model:")
print(f"  Schema Digest: {FlightDetailsResponseFlight.build_schema_digest(flight_instance)}")
print(f"  Fields: {list(FlightDetailsResponseFlight.__fields__.keys())}")

insurance_digest = FlightDetailsResponseInsurance.build_schema_digest(insurance_instance)
flight_digest = FlightDetailsResponseFlight.build_schema_digest(flight_instance)

print(f"\nDo they match? {insurance_digest == flight_digest}")

if insurance_digest != flight_digest:
    print("\n⚠️ MODEL MISMATCH DETECTED!")
    print("The models have different schemas despite same fields.")
    print("This could be due to:")
    print("  - Different docstrings")
    print("  - Different field ordering")
    print("  - Different type annotations")
else:
    print("\n✅ Models match perfectly!")
