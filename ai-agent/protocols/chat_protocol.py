"""
Chat Protocol for TravelSure Insurance Agent
Implements the standard Fetch.ai chat protocol for natural language communication
"""

from typing import Literal
from datetime import datetime
from pydantic import UUID4
from uagents import Model, Protocol
from uuid import uuid4


class TextContent(Model):
    """Text content type for chat messages"""
    type: Literal["text"]
    text: str


class ResourceMetadata(Model):
    """Metadata for resources"""
    mime_type: str
    role: str


class Resource(Model):
    """Resource reference in chat"""
    uri: str
    metadata: dict[str, str]


class ResourceContent(Model):
    """Resource content type"""
    type: Literal["resource"]
    resource_id: UUID4
    resource: Resource | list[Resource]


class MetadataContent(Model):
    """Metadata content type"""
    type: Literal["metadata"]
    metadata: dict[str, str]


class StartSessionContent(Model):
    """Start session marker"""
    type: Literal["start-session"]


class EndSessionContent(Model):
    """End session marker"""
    type: Literal["end-session"]


class StartStreamContent(Model):
    """Start streaming marker"""
    type: Literal["start-stream"]
    stream_id: UUID4


class EndStreamContent(Model):
    """End streaming marker"""
    type: Literal["end-stream"]
    stream_id: UUID4


# Union type for all content types
AgentContent = (
    TextContent
    | ResourceContent
    | MetadataContent
    | StartSessionContent
    | EndSessionContent
    | StartStreamContent
    | EndStreamContent
)


class ChatMessage(Model):
    """
    Chat message model following Fetch.ai chat protocol specification
    """
    timestamp: datetime
    msg_id: UUID4
    content: list[TextContent | ResourceContent | MetadataContent | StartSessionContent | EndSessionContent | StartStreamContent | EndStreamContent]


class ChatAcknowledgement(Model):
    """
    Acknowledgement for received chat messages
    """
    timestamp: datetime
    acknowledged_msg_id: UUID4
    metadata: dict[str, str] | None = None


def create_text_chat(text: str) -> ChatMessage:
    """
    Helper function to create a text-based chat message
    
    Args:
        text: The text content of the message
        
    Returns:
        ChatMessage with text content
    """
    return ChatMessage(
        timestamp=datetime.now(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=text)],
    )


# Initialize the chat protocol
chat_protocol = Protocol(name="TravelSureChatProtocol", version="1.0.0")
