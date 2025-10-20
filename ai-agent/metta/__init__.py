"""
MeTTa Integration Module for TravelSure Flight Insurance
Provides structured knowledge reasoning using SingularityNET's MeTTa framework
"""

from .knowledge import initialize_insurance_knowledge
from .insurance_rag import InsuranceRAG
from .utils import LLM, process_insurance_query

__all__ = [
    'initialize_insurance_knowledge',
    'InsuranceRAG',
    'LLM',
    'process_insurance_query'
]
