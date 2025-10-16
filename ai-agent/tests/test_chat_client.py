"""
Test Client for TravelSure Insurance Agent with Chat Protocol
This client demonstrates how to interact with the agent using chat messages
"""

from uagents import Agent, Context, Model
from datetime import datetime
from uuid import uuid4
import asyncio

# Import chat protocol components
from protocols.chat_protocol import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    create_text_chat,
)

# Your insurance agent address
INSURANCE_AGENT_ADDRESS = "agent1qwkf3g8u75l6ycw2zjykmxewr546r5hu8vcqdzkyzs37la3kxc73jcs4avv"

# Create test client agent
test_client = Agent(
    name="TravelSure-TestClient",
    seed="test_client_seed_phrase_12345",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
)

# Test messages to send
test_messages = [
    "Hello! I need help with flight insurance.",
    "I have flight AA123 tomorrow. What insurance should I get?",
    "Can you help me with flight DL4567?",
    "How does this work?",
]

current_message_index = 0


@test_client.on_event("startup")
async def on_startup(ctx: Context):
    """Log client startup"""
    ctx.logger.info("Test Client Started")
    ctx.logger.info(f"Client Address: {test_client.address}")
    ctx.logger.info(f"Target Agent: {INSURANCE_AGENT_ADDRESS}")
    ctx.logger.info("=" * 60)


@test_client.on_interval(period=15.0)
async def send_test_message(ctx: Context):
    """Send test messages to the insurance agent"""
    global current_message_index
    
    if current_message_index < len(test_messages):
        message_text = test_messages[current_message_index]
        
        ctx.logger.info("=" * 60)
        ctx.logger.info(f"Sending message {current_message_index + 1}/{len(test_messages)}")
        ctx.logger.info(f"Message: {message_text}")
        ctx.logger.info("=" * 60)
        
        # Create and send chat message
        chat_msg = create_text_chat(message_text)
        
        try:
            await ctx.send(INSURANCE_AGENT_ADDRESS, chat_msg)
            ctx.logger.info("✓ Message sent successfully")
        except Exception as e:
            ctx.logger.error(f"✗ Error sending message: {e}")
        
        current_message_index += 1
    else:
        ctx.logger.info("All test messages sent. Waiting for responses...")


@test_client.on_message(ChatAcknowledgement)
async def handle_acknowledgement(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Handle acknowledgements from the insurance agent"""
    ctx.logger.info("=" * 60)
    ctx.logger.info("📬 Received Acknowledgement")
    ctx.logger.info(f"From: {sender}")
    ctx.logger.info(f"For Message ID: {msg.acknowledged_msg_id}")
    ctx.logger.info(f"Timestamp: {msg.timestamp}")
    if msg.metadata:
        ctx.logger.info(f"Metadata: {msg.metadata}")
    ctx.logger.info("=" * 60)


@test_client.on_message(ChatMessage)
async def handle_chat_response(ctx: Context, sender: str, msg: ChatMessage):
    """Handle chat responses from the insurance agent"""
    ctx.logger.info("=" * 60)
    ctx.logger.info("💬 Received Chat Response")
    ctx.logger.info(f"From: {sender}")
    ctx.logger.info(f"Message ID: {msg.msg_id}")
    ctx.logger.info(f"Timestamp: {msg.timestamp}")
    ctx.logger.info("=" * 60)
    
    # Extract and display content
    for content in msg.content:
        if hasattr(content, 'type'):
            if content.type == "text":
                ctx.logger.info("📝 Response Text:")
                ctx.logger.info("-" * 60)
                ctx.logger.info(content.text)
                ctx.logger.info("-" * 60)
            elif content.type == "metadata":
                ctx.logger.info(f"📎 Metadata: {content.metadata}")
    
    ctx.logger.info("=" * 60)
    
    # Send acknowledgement back
    ack = ChatAcknowledgement(
        timestamp=datetime.now(),
        acknowledged_msg_id=msg.msg_id,
    )
    await ctx.send(sender, ack)


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TravelSure Chat Protocol Test Client")
    print("=" * 60)
    print()
    print("This client will send test messages to the insurance agent")
    print("and display the responses.")
    print()
    print(f"Target Agent: {INSURANCE_AGENT_ADDRESS}")
    print(f"Test Messages: {len(test_messages)}")
    print()
    print("Starting client...")
    print("=" * 60)
    print()
    
    test_client.run()
