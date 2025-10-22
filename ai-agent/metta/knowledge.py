# knowledge.py
from hyperon import MeTTa, E, S, ValueAtom

def initialize_insurance_knowledge(metta: MeTTa):
    """
    Initialize the MeTTa knowledge graph with comprehensive flight insurance domain knowledge.
    Covers: insurance types, risk factors, airlines, delays, cancellations, smart contracts, FAQs
    """
    
    # ===== INSURANCE TYPES → THRESHOLDS =====
    metta.space().add_atom(E(S("insurance_type"), S("delay_2h"), S("2-hour threshold")))
    metta.space().add_atom(E(S("insurance_type"), S("delay_4h"), S("4-hour threshold")))
    metta.space().add_atom(E(S("insurance_type"), S("delay_6h"), S("6-hour threshold")))
    metta.space().add_atom(E(S("insurance_type"), S("delay_8h"), S("8-hour threshold")))
    metta.space().add_atom(E(S("insurance_type"), S("delay_12h"), S("12-hour threshold")))
    metta.space().add_atom(E(S("insurance_type"), S("cancellation"), S("flight cancellation")))
    
    # ===== INSURANCE CHARACTERISTICS =====
    # ===== INSURANCE TYPES (matching PolicyManager.sol tiers) =====
    # 1-Hour Threshold (Platinum Tier)
    metta.space().add_atom(E(S("best_for"), S("delay_1h"), ValueAtom("highly reliable flights with on-time rate > 90%")))
    metta.space().add_atom(E(S("premium_amount"), S("delay_1h"), ValueAtom("$432.00")))
    metta.space().add_atom(E(S("payout_amount"), S("delay_1h"), ValueAtom("$1000.00")))
    metta.space().add_atom(E(S("description"), S("delay_1h"), ValueAtom("Premium protection - highest payout for delays exceeding 1 hour")))
    metta.space().add_atom(E(S("payout_trigger"), S("delay_1h"), ValueAtom("delay exceeds 1 hour")))
    metta.space().add_atom(E(S("blockchain_tier"), S("delay_1h"), ValueAtom("Platinum")))
    
    # 2-Hour Threshold (Gold Tier)
    metta.space().add_atom(E(S("best_for"), S("delay_2h"), ValueAtom("reliable flights with on-time rate 80-90%")))
    metta.space().add_atom(E(S("premium_amount"), S("delay_2h"), ValueAtom("$183.75")))
    metta.space().add_atom(E(S("payout_amount"), S("delay_2h"), ValueAtom("$500.00")))
    metta.space().add_atom(E(S("description"), S("delay_2h"), ValueAtom("Gold protection for reliable flights with 2-hour coverage")))
    metta.space().add_atom(E(S("payout_trigger"), S("delay_2h"), ValueAtom("delay exceeds 2 hours")))
    metta.space().add_atom(E(S("blockchain_tier"), S("delay_2h"), ValueAtom("Gold")))
    
    # 3-Hour Threshold (Silver Tier)
    metta.space().add_atom(E(S("best_for"), S("delay_3h"), ValueAtom("moderately reliable flights with on-time rate 65-80%")))
    metta.space().add_atom(E(S("premium_amount"), S("delay_3h"), ValueAtom("$102.00")))
    metta.space().add_atom(E(S("payout_amount"), S("delay_3h"), ValueAtom("$250.00")))
    metta.space().add_atom(E(S("description"), S("delay_3h"), ValueAtom("Silver protection with balanced coverage for moderate delays")))
    metta.space().add_atom(E(S("payout_trigger"), S("delay_3h"), ValueAtom("delay exceeds 3 hours")))
    metta.space().add_atom(E(S("blockchain_tier"), S("delay_3h"), ValueAtom("Silver")))
    
    # 4-Hour Threshold (Basic Tier)
    metta.space().add_atom(E(S("best_for"), S("delay_4h"), ValueAtom("less reliable flights with on-time rate < 65%")))
    metta.space().add_atom(E(S("premium_amount"), S("delay_4h"), ValueAtom("$33.60")))
    metta.space().add_atom(E(S("payout_amount"), S("delay_4h"), ValueAtom("$100.00")))
    metta.space().add_atom(E(S("description"), S("delay_4h"), ValueAtom("Basic protection for budget-conscious travelers")))
    metta.space().add_atom(E(S("payout_trigger"), S("delay_4h"), ValueAtom("delay exceeds 4 hours")))
    metta.space().add_atom(E(S("blockchain_tier"), S("delay_4h"), ValueAtom("Basic")))
    
    # REMOVED OLD TIERS: delay_6h, delay_8h, delay_12h (not in smart contract)    # 4-Hour Threshold
    metta.space().add_atom(E(S("best_for"), S("delay_4h"), ValueAtom("consistently good flights with on-time rate 75-85%")))
    metta.space().add_atom(E(S("premium_multiplier"), S("delay_4h"), ValueAtom("0.4")))
    metta.space().add_atom(E(S("description"), S("delay_4h"), ValueAtom("Balanced protection for moderate delay risk")))
    metta.space().add_atom(E(S("payout_trigger"), S("delay_4h"), ValueAtom("delay exceeds 4 hours")))
    
    # 6-Hour Threshold
    metta.space().add_atom(E(S("best_for"), S("delay_6h"), ValueAtom("moderately delayed flights with on-time rate 65-75%")))
    metta.space().add_atom(E(S("premium_multiplier"), S("delay_6h"), ValueAtom("0.5")))
    metta.space().add_atom(E(S("description"), S("delay_6h"), ValueAtom("Protection for significant delays on less reliable routes")))
    metta.space().add_atom(E(S("payout_trigger"), S("delay_6h"), ValueAtom("delay exceeds 6 hours")))
    
    # 8-Hour Threshold
    metta.space().add_atom(E(S("best_for"), S("delay_8h"), ValueAtom("frequently delayed flights with on-time rate 50-65%")))
    metta.space().add_atom(E(S("premium_multiplier"), S("delay_8h"), ValueAtom("0.6")))
    metta.space().add_atom(E(S("description"), S("delay_8h"), ValueAtom("Extended delay coverage for unreliable flights")))
    metta.space().add_atom(E(S("payout_trigger"), S("delay_8h"), ValueAtom("delay exceeds 8 hours")))
    
    # 12-Hour Threshold
    metta.space().add_atom(E(S("best_for"), S("delay_12h"), ValueAtom("very unreliable flights with on-time rate < 50%")))
    metta.space().add_atom(E(S("premium_multiplier"), S("delay_12h"), ValueAtom("0.7")))
    metta.space().add_atom(E(S("description"), S("delay_12h"), ValueAtom("Maximum protection for extreme delays on problematic routes")))
    metta.space().add_atom(E(S("payout_trigger"), S("delay_12h"), ValueAtom("delay exceeds 12 hours")))
    
    # Cancellation Insurance
    metta.space().add_atom(E(S("best_for"), S("cancellation"), ValueAtom("all flights - free with staking")))
    metta.space().add_atom(E(S("description"), S("cancellation"), ValueAtom("Full refund on flight cancellation")))
    metta.space().add_atom(E(S("payout_trigger"), S("cancellation"), ValueAtom("flight is cancelled")))
    metta.space().add_atom(E(S("staking_benefit"), S("cancellation"), ValueAtom("FREE when staking on travelsure.vercel.app")))
    
    # ===== RISK FACTORS → DELAY PATTERNS =====
    metta.space().add_atom(E(S("risk_factor"), S("low_ontime_rate"), S("high delay risk")))
    metta.space().add_atom(E(S("risk_factor"), S("frequent_cancellations"), S("cancellation risk")))
    metta.space().add_atom(E(S("risk_factor"), S("bad_weather"), S("weather delay risk")))
    metta.space().add_atom(E(S("risk_factor"), S("congested_airport"), S("airport delay risk")))
    metta.space().add_atom(E(S("risk_factor"), S("long_haul_flight"), S("extended delay risk")))
    metta.space().add_atom(E(S("risk_factor"), S("budget_airline"), S("higher delay probability")))
    metta.space().add_atom(E(S("risk_factor"), S("connecting_flight"), S("missed connection risk")))
    metta.space().add_atom(E(S("risk_factor"), S("winter_season"), S("weather disruption risk")))
    metta.space().add_atom(E(S("risk_factor"), S("summer_thunderstorms"), S("seasonal delay risk")))
    
    # ===== DELAY RISK LEVELS → RECOMMENDATIONS (matching smart contract tiers) =====
    metta.space().add_atom(E(S("risk_level"), S("excellent"), ValueAtom("on-time rate > 90%, recommend 1h threshold (Platinum)")))
    metta.space().add_atom(E(S("risk_level"), S("good"), ValueAtom("on-time rate 80-90%, recommend 2h threshold (Gold)")))
    metta.space().add_atom(E(S("risk_level"), S("moderate"), ValueAtom("on-time rate 65-80%, recommend 3h threshold (Silver)")))
    metta.space().add_atom(E(S("risk_level"), S("poor"), ValueAtom("on-time rate < 65%, recommend 4h threshold (Basic)")))
    
    # ===== AIRLINE CHARACTERISTICS =====
    # Premium Airlines
    metta.space().add_atom(E(S("airline_category"), S("premium"), ValueAtom("Emirates, Singapore Airlines, Qatar Airways")))
    metta.space().add_atom(E(S("reliability"), S("premium"), ValueAtom("typically 85%+ on-time performance")))
    
    # Major Carriers
    metta.space().add_atom(E(S("airline_category"), S("major"), ValueAtom("Delta, United, American, British Airways")))
    metta.space().add_atom(E(S("reliability"), S("major"), ValueAtom("typically 75-85% on-time performance")))
    
    # Budget Airlines
    metta.space().add_atom(E(S("airline_category"), S("budget"), ValueAtom("Spirit, Ryanair, Frontier, EasyJet")))
    metta.space().add_atom(E(S("reliability"), S("budget"), ValueAtom("typically 60-75% on-time performance")))
    
    # Regional Carriers
    metta.space().add_atom(E(S("airline_category"), S("regional"), ValueAtom("smaller regional airlines")))
    metta.space().add_atom(E(S("reliability"), S("regional"), ValueAtom("varies widely, 50-80% on-time")))
    
    # ===== WEATHER IMPACT =====
    metta.space().add_atom(E(S("weather_condition"), S("thunderstorms"), ValueAtom("high delay risk, consider 6h+ threshold")))
    metta.space().add_atom(E(S("weather_condition"), S("snow"), ValueAtom("very high delay risk, consider 8h+ threshold")))
    metta.space().add_atom(E(S("weather_condition"), S("fog"), ValueAtom("moderate delay risk, consider 4h+ threshold")))
    metta.space().add_atom(E(S("weather_condition"), S("clear"), ValueAtom("low weather delay risk")))
    metta.space().add_atom(E(S("weather_condition"), S("rain"), ValueAtom("low-moderate delay risk")))
    
    # ===== AIRPORT CONGESTION =====
    metta.space().add_atom(E(S("congested_airport"), S("JFK"), ValueAtom("New York JFK - frequent delays")))
    metta.space().add_atom(E(S("congested_airport"), S("EWR"), ValueAtom("Newark - frequent delays")))
    metta.space().add_atom(E(S("congested_airport"), S("LGA"), ValueAtom("LaGuardia - frequent delays")))
    metta.space().add_atom(E(S("congested_airport"), S("ORD"), ValueAtom("Chicago O'Hare - frequent delays")))
    metta.space().add_atom(E(S("congested_airport"), S("ATL"), ValueAtom("Atlanta - high traffic volume")))
    metta.space().add_atom(E(S("congested_airport"), S("LAX"), ValueAtom("Los Angeles - congestion delays")))
    metta.space().add_atom(E(S("congested_airport"), S("LHR"), ValueAtom("London Heathrow - slot restrictions")))
    
    # ===== SMART CONTRACT FEATURES =====
    metta.space().add_atom(E(S("smart_contract"), S("automated_payout"), ValueAtom("instant payout when threshold exceeded")))
    metta.space().add_atom(E(S("smart_contract"), S("no_paperwork"), ValueAtom("no manual claims required")))
    metta.space().add_atom(E(S("smart_contract"), S("transparent"), ValueAtom("on-chain verification of delays")))
    metta.space().add_atom(E(S("smart_contract"), S("trustless"), ValueAtom("no intermediaries needed")))
    metta.space().add_atom(E(S("smart_contract"), S("pyusd_payment"), ValueAtom("pay premiums in PYUSD stablecoin")))
    
    # ===== STAKING BENEFITS =====
    metta.space().add_atom(E(S("staking"), S("yield_earning"), ValueAtom("earn yields on staked amounts")))
    metta.space().add_atom(E(S("staking"), S("free_cancellation"), ValueAtom("get FREE cancellation insurance")))
    metta.space().add_atom(E(S("staking"), S("pool_support"), ValueAtom("support the insurance pool")))
    metta.space().add_atom(E(S("staking"), S("rewards"), ValueAtom("earn additional rewards")))
    metta.space().add_atom(E(S("staking"), S("platform"), ValueAtom("stake at travelsure.vercel.app")))
    
    # ===== PREMIUM CALCULATION FACTORS =====
    metta.space().add_atom(E(S("premium_factor"), S("base_premium"), ValueAtom("calculated from historical data")))
    metta.space().add_atom(E(S("premium_factor"), S("delay_rate"), ValueAtom("higher delay rate = higher premium")))
    metta.space().add_atom(E(S("premium_factor"), S("threshold_multiplier"), ValueAtom("lower threshold = lower premium")))
    metta.space().add_atom(E(S("premium_factor"), S("cancellation_rate"), ValueAtom("affects cancellation insurance pricing")))
    metta.space().add_atom(E(S("premium_factor"), S("route_risk"), ValueAtom("specific route historical performance")))
    
    # ===== FAQ KNOWLEDGE =====
    metta.space().add_atom(E(S("faq"), S("How does insurance work?"), ValueAtom("Purchase insurance for your flight. If delay exceeds your chosen threshold, smart contract automatically pays you. No claims needed.")))
    metta.space().add_atom(E(S("faq"), S("What thresholds are available?"), ValueAtom("Choose from 2h, 4h, 6h, 8h, or 12h delay thresholds. Lower thresholds cost less but best for reliable flights. Higher thresholds cost more but better for unreliable routes.")))
    metta.space().add_atom(E(S("faq"), S("How is premium calculated?"), ValueAtom("Premiums based on flight's historical on-time performance, delay patterns, route risk, and chosen threshold. More reliable flights = lower premiums.")))
    metta.space().add_atom(E(S("faq"), S("When do I get paid?"), ValueAtom("Automatic smart contract payout when delay exceeds your threshold. No manual claims or paperwork required.")))
    metta.space().add_atom(E(S("faq"), S("What is staking?"), ValueAtom("Stake funds on travelsure.vercel.app to earn yields, get FREE cancellation insurance, and support the insurance pool while earning rewards.")))
    metta.space().add_atom(E(S("faq"), S("What payment methods?"), ValueAtom("Pay premiums in PYUSD stablecoin. All transactions handled via smart contracts on blockchain.")))
    metta.space().add_atom(E(S("faq"), S("Is this trustworthy?"), ValueAtom("Fully decentralized smart contracts. No intermediaries. Transparent on-chain verification. Code is law - payouts are automatic and guaranteed.")))
    metta.space().add_atom(E(S("faq"), S("Which flights are covered?"), ValueAtom("All commercial flights with available historical data. AI analyzes 2-Hour to 12-hour delay thresholds based on your flight's reliability.")))
    metta.space().add_atom(E(S("faq"), S("What about cancellations?"), ValueAtom("Cancellation insurance available. FREE when you stake funds on travelsure.vercel.app. Otherwise, separate premium applies.")))
    metta.space().add_atom(E(S("faq"), S("How accurate is the AI?"), ValueAtom("AI analyzes real historical flight data, on-time performance, delay patterns, weather, and airport congestion to provide accurate risk assessments and recommendations.")))
    
    # ===== RECOMMENDATION LOGIC =====
    metta.space().add_atom(E(S("recommendation"), S("reliable_flight"), ValueAtom("For flights with 85%+ on-time rate: Choose 2h threshold for quick coverage of unexpected delays")))
    metta.space().add_atom(E(S("recommendation"), S("good_flight"), ValueAtom("For flights with 75-85% on-time rate: Choose 4h threshold for balanced protection")))
    metta.space().add_atom(E(S("recommendation"), S("moderate_flight"), ValueAtom("For flights with 65-75% on-time rate: Choose 6h threshold for significant delay coverage")))
    metta.space().add_atom(E(S("recommendation"), S("poor_flight"), ValueAtom("For flights with 50-65% on-time rate: Choose 8h threshold for extended delay protection")))
    metta.space().add_atom(E(S("recommendation"), S("unreliable_flight"), ValueAtom("For flights with <50% on-time rate: Choose 12h threshold for maximum protection")))
    
    # ===== ROUTE-SPECIFIC CONSIDERATIONS =====
    metta.space().add_atom(E(S("route_factor"), S("international"), ValueAtom("longer flights have higher delay risk")))
    metta.space().add_atom(E(S("route_factor"), S("domestic_short"), ValueAtom("shorter flights generally more reliable")))
    metta.space().add_atom(E(S("route_factor"), S("hub_to_hub"), ValueAtom("major hub routes often more reliable")))
    metta.space().add_atom(E(S("route_factor"), S("regional_route"), ValueAtom("regional routes may have higher variability")))
    
    # ===== SEASONAL FACTORS =====
    metta.space().add_atom(E(S("season"), S("winter"), ValueAtom("December-February: snow/ice delays, consider higher thresholds")))
    metta.space().add_atom(E(S("season"), S("summer"), ValueAtom("June-August: thunderstorm delays, monitor weather")))
    metta.space().add_atom(E(S("season"), S("holiday"), ValueAtom("Peak travel times: higher congestion, consider insurance")))
    
    print("[MeTTa] ✅ Flight insurance knowledge graph initialized with comprehensive domain knowledge")
