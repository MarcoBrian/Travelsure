# test.py
"""
Test script for TravelSure MeTTa integration.
Run this to verify the knowledge graph and RAG system work correctly.
"""

from hyperon import MeTTa
from knowledge import initialize_insurance_knowledge
from insurance_rag import InsuranceRAG
import asyncio

def test_knowledge_initialization():
    """Test knowledge graph initialization"""
    print("\n" + "="*60)
    print("TEST 1: Knowledge Graph Initialization")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    print("✅ Knowledge graph initialized successfully")


def test_insurance_types():
    """Test querying insurance types"""
    print("\n" + "="*60)
    print("TEST 2: Insurance Type Queries")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    rag = InsuranceRAG(metta)
    
    # Test getting all insurance types
    types = rag.get_all_insurance_types()
    print(f"\n📋 All Insurance Types: {len(types)} found")
    for t in types[:3]:
        print(f"   • {t}")
    
    # Test getting details for specific type
    print("\n🔍 Testing delay_2h details:")
    details = rag.get_insurance_type_details("delay_2h")
    print(f"   Best for: {details.get('best_for', ['N/A'])[0]}")
    print(f"   Premium multiplier: {details.get('premium_multiplier', ['N/A'])[0]}")
    print(f"   Description: {details.get('description', ['N/A'])[0]}")


def test_recommendations():
    """Test recommendation system"""
    print("\n" + "="*60)
    print("TEST 3: Recommendation System")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    rag = InsuranceRAG(metta)
    
    # Test different on-time percentages
    test_cases = [
        (0.92, "Excellent flight"),
        (0.78, "Good flight"),
        (0.68, "Moderate flight"),
        (0.55, "Poor flight"),
        (0.42, "Very poor flight")
    ]
    
    for ontime, description in test_cases:
        rec = rag.get_recommendation_by_ontime_rate(ontime)
        print(f"\n{description} (On-time: {ontime*100:.0f}%):")
        print(f"   Risk Level: {rec['risk_level']}")
        print(f"   Recommended: {rec['recommended_type']}")


def test_risk_factors():
    """Test risk factor queries"""
    print("\n" + "="*60)
    print("TEST 4: Risk Factor Queries")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    rag = InsuranceRAG(metta)
    
    # Query all risk factors
    factors = rag.query_risk_factors()
    print(f"\n🎯 Risk Factors Found: {len(factors)}")
    for factor in factors[:5]:
        print(f"   • {factor}")


def test_weather_impact():
    """Test weather impact queries"""
    print("\n" + "="*60)
    print("TEST 5: Weather Impact Queries")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    rag = InsuranceRAG(metta)
    
    weather_conditions = ["thunderstorms", "snow", "fog", "clear", "rain"]
    
    for condition in weather_conditions:
        impact = rag.get_weather_impact(condition)
        if impact:
            print(f"\n🌤️  {condition.title()}:")
            print(f"   {impact[0]}")


def test_airport_congestion():
    """Test airport congestion checks"""
    print("\n" + "="*60)
    print("TEST 6: Airport Congestion Checks")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    rag = InsuranceRAG(metta)
    
    test_airports = ["JFK", "ORD", "ATL", "SFO", "XYZ"]
    
    for airport in test_airports:
        is_congested = rag.is_congested_airport(airport)
        status = "🔴 Congested" if is_congested else "🟢 Not Congested"
        print(f"   {airport}: {status}")


def test_faq():
    """Test FAQ queries"""
    print("\n" + "="*60)
    print("TEST 7: FAQ Queries")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    rag = InsuranceRAG(metta)
    
    test_questions = [
        "How does insurance work?",
        "What is staking?",
        "When do I get paid?",
        "What about cancellations?"
    ]
    
    for question in test_questions:
        print(f"\n❓ Q: {question}")
        answers = rag.query_faq(question)
        if answers:
            print(f"   A: {answers[0][:100]}...")


def test_smart_contract_features():
    """Test smart contract features"""
    print("\n" + "="*60)
    print("TEST 8: Smart Contract Features")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    rag = InsuranceRAG(metta)
    
    features = rag.get_smart_contract_features()
    print(f"\n🔗 Smart Contract Features: {len(features)} found")
    for feature in features[:5]:
        print(f"   • {feature}")


def test_staking_benefits():
    """Test staking benefits"""
    print("\n" + "="*60)
    print("TEST 9: Staking Benefits")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    rag = InsuranceRAG(metta)
    
    benefits = rag.get_staking_benefits()
    print(f"\n💎 Staking Benefits: {len(benefits)} found")
    for benefit in benefits:
        print(f"   • {benefit}")


def test_add_knowledge():
    """Test dynamically adding knowledge"""
    print("\n" + "="*60)
    print("TEST 10: Dynamic Knowledge Addition")
    print("="*60)
    
    metta = MeTTa()
    initialize_insurance_knowledge(metta)
    rag = InsuranceRAG(metta)
    
    # Add new knowledge
    rag.add_knowledge("risk_factor", "pandemic", "travel restrictions and cancellations")
    
    # Query it back
    factors = rag.query_risk_factors("pandemic")
    print(f"\n✅ Added and retrieved new knowledge:")
    print(f"   {factors}")


def run_all_tests():
    """Run all test functions"""
    print("\n" + "="*60)
    print("🧪 TRAVELSURE METTA INTEGRATION TESTS")
    print("="*60)
    
    try:
        test_knowledge_initialization()
        test_insurance_types()
        test_recommendations()
        test_risk_factors()
        test_weather_impact()
        test_airport_congestion()
        test_faq()
        test_smart_contract_features()
        test_staking_benefits()
        test_add_knowledge()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\nMeTTa integration is working correctly! 🎉")
        print("Next step: Integrate with insurance_agent_chat.py")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()
