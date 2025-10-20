# insurance_rag.py
import re
from hyperon import MeTTa, E, S, ValueAtom

class InsuranceRAG:
    """
    RAG (Retrieval-Augmented Generation) system for flight insurance knowledge.
    Provides structured query methods for retrieving insurance recommendations,
    risk factors, premium calculations, and FAQs.
    """
    
    def __init__(self, metta_instance: MeTTa):
        """
        Initialize the Insurance RAG with a MeTTa instance.
        
        Args:
            metta_instance: An initialized MeTTa instance with insurance knowledge
        """
        self.metta = metta_instance
    
    def _extract_results(self, query_result):
        """Extract and clean results from MeTTa query"""
        results = []
        for item in query_result:
            # Convert to string and clean
            result_str = str(item)
            # Remove brackets and extract content
            result_str = result_str.strip('[]()').strip()
            if result_str and result_str not in results:
                results.append(result_str)
        return results
    
    def get_insurance_type_details(self, insurance_type: str) -> dict:
        """
        Get detailed information about an insurance type.
        
        Args:
            insurance_type: One of delay_2h, delay_4h, delay_6h, delay_8h, delay_12h, cancellation
            
        Returns:
            Dictionary with insurance type details
        """
        try:
            # Query best_for
            best_for_query = f'!(match &self (best_for {insurance_type} $x) $x)'
            best_for = self.metta.run(best_for_query)
            
            # Query premium multiplier
            premium_query = f'!(match &self (premium_multiplier {insurance_type} $x) $x)'
            premium = self.metta.run(premium_query)
            
            # Query description
            desc_query = f'!(match &self (description {insurance_type} $x) $x)'
            description = self.metta.run(desc_query)
            
            # Query payout trigger
            trigger_query = f'!(match &self (payout_trigger {insurance_type} $x) $x)'
            trigger = self.metta.run(trigger_query)
            
            return {
                "type": insurance_type,
                "best_for": self._extract_results(best_for),
                "premium_multiplier": self._extract_results(premium),
                "description": self._extract_results(description),
                "payout_trigger": self._extract_results(trigger)
            }
        except Exception as e:
            print(f"[InsuranceRAG] Error querying insurance type: {e}")
            return {}
    
    def get_recommendation_by_ontime_rate(self, ontime_percent: float) -> dict:
        """
        Get insurance recommendation based on on-time performance.
        
        Args:
            ontime_percent: Flight's on-time percentage (0.0 to 1.0)
            
        Returns:
            Dictionary with recommendation
        """
        if ontime_percent >= 0.85:
            risk_level = "excellent"
            recommended_type = "delay_2h"
        elif ontime_percent >= 0.75:
            risk_level = "good"
            recommended_type = "delay_4h"
        elif ontime_percent >= 0.65:
            risk_level = "moderate"
            recommended_type = "delay_6h"
        elif ontime_percent >= 0.50:
            risk_level = "poor"
            recommended_type = "delay_8h"
        else:
            risk_level = "very_poor"
            recommended_type = "delay_12h"
        
        # Get recommendation text
        query = f'!(match &self (recommendation {risk_level}_flight $x) $x)'
        recommendation = self.metta.run(query)
        
        return {
            "risk_level": risk_level,
            "recommended_type": recommended_type,
            "ontime_percent": ontime_percent,
            "recommendation_text": self._extract_results(recommendation)
        }
    
    def query_risk_factors(self, factor_type: str = None) -> list:
        """
        Query risk factors. If factor_type is None, returns all risk factors.
        
        Args:
            factor_type: Specific risk factor to query (optional)
            
        Returns:
            List of risk factors
        """
        try:
            if factor_type:
                query = f'!(match &self (risk_factor {factor_type} $x) $x)'
            else:
                query = '!(match &self (risk_factor $type $impact) ($type $impact))'
            
            results = self.metta.run(query)
            return self._extract_results(results)
        except Exception as e:
            print(f"[InsuranceRAG] Error querying risk factors: {e}")
            return []
    
    def get_weather_impact(self, weather_condition: str) -> list:
        """
        Get delay risk impact for specific weather conditions.
        
        Args:
            weather_condition: Weather condition (thunderstorms, snow, fog, clear, rain)
            
        Returns:
            List of weather impact information
        """
        try:
            query = f'!(match &self (weather_condition {weather_condition} $x) $x)'
            results = self.metta.run(query)
            return self._extract_results(results)
        except Exception as e:
            print(f"[InsuranceRAG] Error querying weather impact: {e}")
            return []
    
    def is_congested_airport(self, airport_code: str) -> bool:
        """
        Check if an airport is known for congestion delays.
        
        Args:
            airport_code: IATA airport code
            
        Returns:
            Boolean indicating if airport is congested
        """
        try:
            query = f'!(match &self (congested_airport {airport_code} $x) $x)'
            results = self.metta.run(query)
            return len(self._extract_results(results)) > 0
        except Exception as e:
            print(f"[InsuranceRAG] Error checking airport congestion: {e}")
            return False
    
    def get_airline_reliability(self, airline_name: str) -> list:
        """
        Get reliability information for airline categories.
        
        Args:
            airline_name: Airline name to check
            
        Returns:
            List of reliability information
        """
        try:
            # Check each category
            for category in ["premium", "major", "budget", "regional"]:
                query = f'!(match &self (airline_category {category} $x) $x)'
                results = self.metta.run(query)
                airlines = self._extract_results(results)
                
                # Check if airline is in this category
                for airline_str in airlines:
                    if airline_name.lower() in airline_str.lower():
                        # Get reliability for this category
                        rel_query = f'!(match &self (reliability {category} $x) $x)'
                        reliability = self.metta.run(rel_query)
                        return [f"{category} airline: {r}" for r in self._extract_results(reliability)]
            
            return ["No specific airline reliability data available"]
        except Exception as e:
            print(f"[InsuranceRAG] Error querying airline reliability: {e}")
            return []
    
    def query_faq(self, question: str) -> list:
        """
        Query FAQ knowledge base.
        
        Args:
            question: FAQ question (exact or partial match)
            
        Returns:
            List of FAQ answers
        """
        try:
            # Try exact match first
            query = f'!(match &self (faq "{question}" $x) $x)'
            results = self.metta.run(query)
            exact_results = self._extract_results(results)
            
            if exact_results:
                return exact_results
            
            # If no exact match, try partial matching by querying all FAQs
            all_faqs_query = '!(match &self (faq $q $a) ($q $a))'
            all_faqs = self.metta.run(all_faqs_query)
            
            # Search for partial matches
            question_lower = question.lower()
            matches = []
            for faq in self._extract_results(all_faqs):
                if question_lower in faq.lower():
                    matches.append(faq)
            
            return matches if matches else ["No matching FAQ found. Ask about: insurance work, thresholds, premiums, payouts, staking, payments, trust, coverage, cancellations, AI accuracy."]
        except Exception as e:
            print(f"[InsuranceRAG] Error querying FAQ: {e}")
            return []
    
    def get_all_insurance_types(self) -> list:
        """
        Get all available insurance types.
        
        Returns:
            List of insurance type names
        """
        try:
            query = '!(match &self (insurance_type $type $name) ($type $name))'
            results = self.metta.run(query)
            return self._extract_results(results)
        except Exception as e:
            print(f"[InsuranceRAG] Error querying insurance types: {e}")
            return []
    
    def get_smart_contract_features(self) -> list:
        """
        Get all smart contract features.
        
        Returns:
            List of smart contract features
        """
        try:
            query = '!(match &self (smart_contract $feature $desc) ($feature $desc))'
            results = self.metta.run(query)
            return self._extract_results(results)
        except Exception as e:
            print(f"[InsuranceRAG] Error querying smart contract features: {e}")
            return []
    
    def get_staking_benefits(self) -> list:
        """
        Get all staking benefits.
        
        Returns:
            List of staking benefits
        """
        try:
            query = '!(match &self (staking $benefit $desc) ($benefit $desc))'
            results = self.metta.run(query)
            return self._extract_results(results)
        except Exception as e:
            print(f"[InsuranceRAG] Error querying staking benefits: {e}")
            return []
    
    def get_premium_factors(self) -> list:
        """
        Get factors that affect premium calculation.
        
        Returns:
            List of premium calculation factors
        """
        try:
            query = '!(match &self (premium_factor $factor $desc) ($factor $desc))'
            results = self.metta.run(query)
            return self._extract_results(results)
        except Exception as e:
            print(f"[InsuranceRAG] Error querying premium factors: {e}")
            return []
    
    def get_seasonal_considerations(self, season: str = None) -> list:
        """
        Get seasonal delay considerations.
        
        Args:
            season: Specific season (winter, summer, holiday) or None for all
            
        Returns:
            List of seasonal considerations
        """
        try:
            if season:
                query = f'!(match &self (season {season} $x) $x)'
            else:
                query = '!(match &self (season $s $desc) ($s $desc))'
            
            results = self.metta.run(query)
            return self._extract_results(results)
        except Exception as e:
            print(f"[InsuranceRAG] Error querying seasonal factors: {e}")
            return []
    
    def add_knowledge(self, relation_type: str, subject: str, object_value: str):
        """
        Dynamically add new knowledge to the graph.
        
        Args:
            relation_type: Type of relationship (e.g., "risk_factor", "faq")
            subject: Subject of the relationship
            object_value: Value/object of the relationship
        """
        try:
            self.metta.space().add_atom(
                E(S(relation_type), S(subject), ValueAtom(object_value))
            )
            print(f"[InsuranceRAG] ✅ Added knowledge: ({relation_type} {subject} {object_value})")
        except Exception as e:
            print(f"[InsuranceRAG] Error adding knowledge: {e}")
    
    def get_comprehensive_recommendation(self, flight_data: dict) -> dict:
        """
        Get comprehensive insurance recommendation using multi-factor MeTTa reasoning.
        
        Leverages multiple knowledge graph queries:
        - On-time performance analysis
        - Weather impact assessment
        - Airport congestion factors
        - Seasonal considerations
        - Route complexity analysis
        
        Args:
            flight_data: Dictionary containing:
                - ontime_percent: float (0.0 to 1.0)
                - weather_condition: str (optional)
                - origin_iata: str (optional)
                - destination_iata: str (optional)
                - date: str (optional, for seasonal analysis)
                - cancelled_count: int (optional)
                
        Returns:
            Dictionary with comprehensive recommendation and reasoning
        """
        risk_factors = []
        reasoning_components = []
        risk_adjustments = 0.0  # Track cumulative risk adjustment
        
        # 1. Base recommendation from on-time performance
        ontime_percent = flight_data.get('ontime_percent', 0.5)
        base_rec = self.get_recommendation_by_ontime_rate(ontime_percent)
        recommended_type = base_rec['recommended_type']
        risk_level = base_rec['risk_level']
        
        reasoning_components.append(
            f"Historical performance: {ontime_percent*100:.1f}% on-time ({risk_level} risk)"
        )
        
        # 2. Weather impact analysis
        weather_condition = flight_data.get('weather_condition')
        if weather_condition:
            weather_impact = self.get_weather_impact(weather_condition.lower())
            
            # Adjust recommendation based on severe weather
            if weather_condition.lower() in ['thunderstorms', 'snow', 'fog']:
                risk_adjustments += 0.15
                risk_factors.append(f"Weather: {weather_condition.title()}")
                if weather_impact:
                    reasoning_components.append(f"⚠️ {weather_impact[0]}")
                else:
                    reasoning_components.append(f"⚠️ Severe weather ({weather_condition}) increases delay likelihood")
            elif weather_condition.lower() == 'rain':
                risk_adjustments += 0.05
                risk_factors.append(f"Weather: {weather_condition.title()}")
                if weather_impact:
                    reasoning_components.append(f"🌧️ {weather_impact[0]}")
                else:
                    reasoning_components.append(f"🌧️ Rain may cause minor delays")
            elif weather_condition.lower() in ['clear', 'clouds']:
                # Good weather - mention it positively
                reasoning_components.append(f"☀️ Favorable weather conditions ({weather_condition}) support on-time performance")
        
        # 3. Airport congestion analysis
        origin_iata = flight_data.get('origin_iata')
        destination_iata = flight_data.get('destination_iata')
        
        congested_airports = []
        if origin_iata and self.is_congested_airport(origin_iata):
            congested_airports.append(origin_iata)
            risk_adjustments += 0.10
            
        if destination_iata and self.is_congested_airport(destination_iata):
            congested_airports.append(destination_iata)
            risk_adjustments += 0.10
        
        if congested_airports:
            risk_factors.append(f"Congested airports: {', '.join(congested_airports)}")
            reasoning_components.append(
                f"🏢 High-traffic airports ({', '.join(congested_airports)}) increase delay risk"
            )
        
        # 4. Seasonal considerations
        date_str = flight_data.get('date', '')
        season_detected = False
        if date_str:
            try:
                from datetime import datetime
                flight_date = datetime.strptime(date_str, '%Y-%m-%d')
                month = flight_date.month
                day = flight_date.day
                
                # Determine season with more comprehensive coverage
                if month in [12, 1, 2]:
                    season = 'winter'
                    risk_adjustments += 0.12
                    season_detected = True
                elif month in [6, 7, 8]:
                    season = 'summer'
                    risk_adjustments += 0.08
                    season_detected = True
                elif month == 11 or (month == 12 and day > 15) or (month == 1 and day < 7):
                    season = 'holiday'
                    risk_adjustments += 0.15
                    season_detected = True
                elif month in [3, 4, 5]:
                    # Spring - generally good weather but include it
                    reasoning_components.append(f"📅 Spring travel season - generally favorable conditions")
                elif month in [9, 10, 11]:
                    # Fall - transitional weather
                    reasoning_components.append(f"📅 Fall travel season - weather patterns transitioning")
                
                if season_detected:
                    seasonal_info = self.get_seasonal_considerations(season)
                    if seasonal_info:
                        risk_factors.append(f"Season: {season.title()}")
                        reasoning_components.append(f"📅 {seasonal_info[0]}")
                if season_detected:
                    seasonal_info = self.get_seasonal_considerations(season)
                    if seasonal_info:
                        risk_factors.append(f"Season: {season.title()}")
                        reasoning_components.append(f"📅 {seasonal_info[0]}")
            except:
                pass
        
        # 5. Cancellation history
        cancelled_count = flight_data.get('cancelled_count', 0)
        if cancelled_count > 0:
            risk_factors.append(f"Cancellation history: {cancelled_count} events")
            risk_adjustments += 0.10
            reasoning_components.append(
                f"❌ Flight has {cancelled_count} cancellation(s) on record"
            )
        
        # 6. Add performance insights
        total_flights = flight_data.get('total_historical_flights', 0)
        if total_flights > 0:
            if ontime_percent >= 0.85:
                reasoning_components.append(
                    f"✅ Excellent reliability with {total_flights} flights analyzed - minimal delay risk"
                )
            elif ontime_percent >= 0.75:
                reasoning_components.append(
                    f"👍 Good track record across {total_flights} flights - consistent performance"
                )
            elif ontime_percent >= 0.65:
                reasoning_components.append(
                    f"📊 Moderate reliability across {total_flights} flights - consider mid-range coverage"
                )
            else:
                reasoning_components.append(
                    f"⚠️ Based on {total_flights} flights, this route shows higher delay frequency"
                )
        
        # 6. Apply risk adjustments to upgrade recommendation if needed
        delay_rate = 1 - ontime_percent + risk_adjustments
        original_recommendation = recommended_type
        
        # Threshold upgrade logic based on total risk
        if delay_rate >= 0.50 and recommended_type in ['delay_2h', 'delay_4h', 'delay_6h']:
            recommended_type = 'delay_12h'
            reasoning_components.append(
                "⬆️ Risk factors suggest upgrading to higher threshold for better protection"
            )
        elif delay_rate >= 0.35 and recommended_type in ['delay_2h', 'delay_4h']:
            recommended_type = 'delay_8h'
            reasoning_components.append(
                "⬆️ Multiple risk factors warrant increased coverage threshold"
            )
        elif delay_rate >= 0.25 and recommended_type == 'delay_2h':
            recommended_type = 'delay_6h'
            reasoning_components.append(
                "⬆️ Risk factors suggest moderate threshold increase"
            )
        else:
            # No upgrade needed - this is good news!
            if risk_adjustments > 0:
                reasoning_components.append(
                    f"✓ Risk factors reviewed - {original_recommendation.replace('_', ' ')} threshold remains optimal"
                )
            else:
                reasoning_components.append(
                    f"✓ Low risk profile supports {original_recommendation.replace('_', ' ')} threshold recommendation"
                )
        
        # 7. Get detailed insurance type information
        insurance_details = self.get_insurance_type_details(recommended_type)
        
        # 8. Build comprehensive reasoning with proper line spacing
        full_reasoning = "\n\n🔍 ".join(reasoning_components)
        
        # 9. Calculate confidence based on data completeness
        confidence = 0.70  # Base confidence
        if weather_condition:
            confidence += 0.05
        if origin_iata and destination_iata:
            confidence += 0.05
        if date_str:
            confidence += 0.05
        if flight_data.get('total_historical_flights', 0) > 50:
            confidence += 0.10
        
        confidence = min(confidence, 0.95)  # Cap at 95%
        
        return {
            "recommended_type": recommended_type,
            "risk_level": risk_level,
            "confidence": confidence,
            "reasoning": full_reasoning,
            "risk_factors": risk_factors,
            "insurance_details": insurance_details,
            "total_risk_score": min(delay_rate, 1.0),
            "risk_adjustments_applied": risk_adjustments
        }
