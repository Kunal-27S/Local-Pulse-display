from fastapi import FastAPI, Query, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, List
import uvicorn
from pydantic import BaseModel
import logging
import traceback
import json
import uuid
import time
from datetime import datetime, timedelta
from llm_working import ChatbotLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Chatbot API",
    description="A chatbot service that handles maps, weather, and general questions based on user location",
    version="1.0.0"
)

# Add CORS middleware to handle cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://frontend-g2plvgg63a-el.a.run.app",
    "http://localhost:3000"],  # In production, replace with specific origins
    allow_credentials=True,  # Important for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        # "*",  # Allow all headers
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "User-Agent",
        "DNT",
        "Cache-Control",
        "X-Mx-ReqToken",
        "Keep-Alive",
        "X-Requested-With",
        "If-Modified-Since",
        "Accept-Language",
        "Content-Language"
    ],
)


# In-memory storage for user histories (In production, use Redis or a database)
user_histories: Dict[str, List[Dict]] = {}
user_last_activity: Dict[str, datetime] = {}

# Configuration
HISTORY_EXPIRY_HOURS = 24  # Clear history after 24 hours of inactivity
MAX_HISTORY_LENGTH = 5  # Keep last 5 conversation turns

# Response models
class ChatResponse(BaseModel):
    question: str
    latitude: float
    longitude: float
    response: str
    status: str
    user_id: str
    conversation_turn: int

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[str] = None
    status: str = "error"

# Utility functions for history management
def cleanup_expired_histories():
    """Remove expired user histories"""
    current_time = datetime.now()
    expired_users = []
    
    for user_id, last_activity in user_last_activity.items():
        if current_time - last_activity > timedelta(hours=HISTORY_EXPIRY_HOURS):
            expired_users.append(user_id)
    
    for user_id in expired_users:
        if user_id in user_histories:
            del user_histories[user_id]
        del user_last_activity[user_id]
        logger.info(f"Cleaned up expired history for user: {user_id}")

def get_or_create_user_id(request: Request) -> str:
    """Get user ID from cookie or create a new one"""
    user_id = request.cookies.get("chatbot_user_id")
    if not user_id:
        user_id = str(uuid.uuid4())
        logger.info(f"Created new user ID: {user_id}")
    return user_id

def get_user_history(user_id: str) -> List[Dict]:
    """Get conversation history for a user"""
    cleanup_expired_histories()
    return user_histories.get(user_id, [])

def update_user_history(user_id: str, history: List[Dict]):
    """Update conversation history for a user"""
    user_histories[user_id] = history
    user_last_activity[user_id] = datetime.now()
    logger.info(f"Updated history for user {user_id}: {len(history)} turns")

def add_to_user_history(user_id: str, role: str, text: str):
    """Add a message to user's conversation history"""
    history = get_user_history(user_id)
    history.append({"role": role, "parts": [{"text": text}]})
    
    # Maintain max history length (keep last MAX_HISTORY_LENGTH * 2 entries)
    while len(history) > MAX_HISTORY_LENGTH * 2:
        history.pop(0)
    
    update_user_history(user_id, history)

# Health check endpoints
@app.get("/", tags=["Health"])
async def root():
    return {"message": "AI Chatbot API is running!", "status": "healthy"}

@app.get("/health", tags=["Health"])
async def health_check():
    active_users = len(user_histories)
    total_conversations = sum(len(history) for history in user_histories.values())
    return {
        "status": "healthy", 
        "service": "AI Chatbot API", 
        "version": "1.0.0",
        "active_users": active_users,
        "total_conversations": total_conversations
    }

@app.get("/test", tags=["Health"])
async def test_chatbot():
    try:
        chatbot = ChatbotLocal()
        return {"status": "success", "message": "Chatbot initialized successfully"}
    except Exception as e:
        logger.error(f"Chatbot initialization failed: {str(e)}")
        return {"status": "error", "message": f"Chatbot initialization failed: {str(e)}"}

# User management endpoints
@app.get("/user/history", tags=["User Management"])
async def get_user_conversation_history(request: Request):
    """Get the current user's conversation history"""
    user_id = get_or_create_user_id(request)
    history = get_user_history(user_id)
    return {
        "user_id": user_id,
        "history": history,
        "conversation_turns": len(history),
        "status": "success"
    }

@app.delete("/user/history", tags=["User Management"])
async def clear_user_history(request: Request):
    """Clear the current user's conversation history"""
    user_id = get_or_create_user_id(request)
    if user_id in user_histories:
        del user_histories[user_id]
    if user_id in user_last_activity:
        del user_last_activity[user_id]
    
    logger.info(f"Cleared history for user: {user_id}")
    return {
        "user_id": user_id,
        "message": "Conversation history cleared successfully",
        "status": "success"
    }

# Main chatbot endpoint (GET)
@app.get("/chat", response_model=ChatResponse, tags=["Chatbot"])
async def chat_with_bot_get(
    request: Request,
    response: Response,
    question: str = Query(..., description="The question to ask the chatbot", min_length=1),
    lat: float = Query(..., description="User's latitude coordinate", ge=-90, le=90),
    long: float = Query(..., description="User's longitude coordinate", ge=-180, le=180),
    user_id: Optional[str] = Query(None, description="Optional user ID for maintaining history")
):
    """
    Chat with the AI assistant by providing a question and your location coordinates using GET method.
    """
    return await process_chat_request(request, response, question, lat, long, user_id)

# Main chatbot endpoint (POST)
@app.post("/chat", response_model=ChatResponse, tags=["Chatbot"])
async def chat_with_bot_post(
    request: Request,
    response: Response,
    question: str = Query(..., description="The question to ask the chatbot", min_length=1),
    lat: float = Query(..., description="User's latitude coordinate", ge=-90, le=90),
    long: float = Query(..., description="User's longitude coordinate", ge=-180, le=180),
    user_id: Optional[str] = Query(None, description="Optional user ID for maintaining history")
):
    """
    Chat with the AI assistant by providing a question and your location coordinates using POST method.
    """
    return await process_chat_request(request, response, question, lat, long, user_id)

@app.options("/chat", tags=["Chatbot"])
async def chat_options():
    return {"message": "OK"}


# Shared function to process chat requests
async def process_chat_request(
    request: Request, 
    response: Response, 
    question: str, 
    lat: float, 
    long: float, 
    provided_user_id: Optional[str] = None
):
    """
    Process the chat request with proper error handling and user history management
    """
    try:
        # Get or create user ID
        if provided_user_id:
            user_id = provided_user_id
        else:
            user_id = get_or_create_user_id(request)
        
        # Set user ID cookie (expires in 30 days)
        response.set_cookie(
            key="chatbot_user_id",
            value=user_id,
            max_age=30 * 24 * 60 * 60,  # 30 days in seconds
            httponly=True,
            secure=True,  # Set to True in production with HTTPS
            samesite="None"
        )
        
        logger.info(f"Processing chat request for user {user_id}: question='{question[:50]}...', lat={lat}, long={long}")
        
        # Get user's conversation history
        conversation_history = get_user_history(user_id)
        
        # Add user message to history
        add_to_user_history(user_id, "user", question)
        
        # Initialize the chatbot
        chatbot = ChatbotLocal()
        logger.info("Chatbot initialized successfully")
        
        # Modify the chatbot to use the existing history
        chatbot.conversation_history = conversation_history.copy()
        
        # Call your conversation function
        response_message = chatbot.conversation(
            question_asked=question,
            user_lat=lat,
            user_long=long
        )
        
        # Add bot response to history
        add_to_user_history(user_id, "model", response_message)
        
        # Get updated conversation count
        updated_history = get_user_history(user_id)
        conversation_turn = len(updated_history) // 2  # Divide by 2 since each turn has user + model
        
        logger.info(f"Chat response generated successfully for user {user_id}")
        
        # Return the response
        return ChatResponse(
            question=question,
            latitude=lat,
            longitude=long,
            response=response_message,
            status="success",
            user_id=user_id,
            conversation_turn=conversation_turn
        )
        
    except Exception as e:
        # Log the full error with traceback
        error_msg = str(e)
        logger.error(f"Error processing chat request: {error_msg}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Handle different types of errors
        if "ChatbotLocal" in error_msg:
            detail = "Chatbot initialization failed. Please try again later."
        elif "conversation" in error_msg:
            detail = "Error generating response. Please rephrase your question and try again."
        else:
            detail = f"Error processing your request: {error_msg}"
        
        raise HTTPException(
            status_code=500,
            detail=detail
        )

# Enhanced API info endpoint
@app.get("/info", tags=["Information"])
async def api_info():
    return {
        "service": "AI Chatbot API",
        "version": "1.0.0",
        "description": "A chatbot service that handles maps, weather, and general questions based on user location with conversation history",
        "features": [
            "User-specific conversation history",
            "Cookie-based session management",
            "Location-based services",
            "Weather information",
            "Maps and places search",
            "General conversation"
        ],
        "endpoints": {
            "GET /": "Root endpoint - API status",
            "GET /health": "Health check endpoint with user statistics",
            "GET /test": "Test chatbot initialization",
            "GET /chat": "Main chatbot endpoint (GET method)",
            "POST /chat": "Main chatbot endpoint (POST method)",
            "GET /user/history": "Get current user's conversation history",
            "DELETE /user/history": "Clear current user's conversation history",
            "GET /info": "API information and examples",
            "GET /docs": "Interactive API documentation (Swagger UI)",
            "GET /redoc": "Alternative API documentation (ReDoc)"
        },
        "parameters": {
            "question": "Your question for the chatbot (required, min 1 character)",
            "lat": "Your latitude coordinate (required, -90 to 90)",
            "long": "Your longitude coordinate (required, -180 to 180)",
            "user_id": "Optional user ID for maintaining history (auto-generated if not provided)"
        },
        "examples": {
            "weather": "/chat?question=What's the weather like?&lat=22.560768&long=88.375296",
            "restaurants": "/chat?question=Find restaurants near me&lat=22.560768&long=88.375296",
            "general": "/chat?question=Hello, how are you?&lat=22.560768&long=88.375296",
            "maps": "/chat?question=Show me directions to the nearest hospital&lat=22.560768&long=88.375296",
            "with_user_id": "/chat?question=Hello&lat=22.560768&long=88.375296&user_id=your-custom-id"
        },
        "history_management": {
            "storage": "In-memory (server-side) with cookie-based user identification",
            "max_history_length": f"{MAX_HISTORY_LENGTH} conversation turns",
            "expiry": f"{HISTORY_EXPIRY_HOURS} hours of inactivity",
            "cookie_name": "chatbot_user_id",
            "cookie_duration": "30 days"
        }
    }

# Enhanced statistics endpoint
@app.get("/stats", tags=["Information"])
async def get_statistics():
    """Get API usage statistics"""
    cleanup_expired_histories()
    
    active_users = len(user_histories)
    total_conversations = sum(len(history) for history in user_histories.values())
    
    # Calculate average conversations per user
    avg_conversations = total_conversations / active_users if active_users > 0 else 0
    
    return {
        "active_users": active_users,
        "total_conversations": total_conversations,
        "average_conversations_per_user": round(avg_conversations, 2),
        "max_history_length": MAX_HISTORY_LENGTH,
        "history_expiry_hours": HISTORY_EXPIRY_HOURS,
        "timestamp": datetime.now().isoformat(),
        "status": "success"
    }

# Custom error handlers
@app.exception_handler(422)
async def validation_exception_handler(request: Request, exc):
    logger.warning(f"Validation error for {request.url}: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "message": "Please check your input parameters",
            "details": str(exc),
            "status": "error",
            "help": "Ensure question is not empty, lat is between -90 and 90, and long is between -180 and 180"
        }
    )

@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc):
    logger.error(f"Internal server error for {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "Something went wrong processing your request",
            "details": str(exc),
            "status": "error"
        }
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"The endpoint {request.url.path} was not found",
            "status": "error",
            "available_endpoints": ["/chat", "/health", "/info", "/docs", "/user/history"]
        }
    )

# Middleware to log requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log the request with user ID if available
    user_id = request.cookies.get("chatbot_user_id", "anonymous")
    logger.info(f"Request: {request.method} {request.url} [User: {user_id}]")
    
    response = await call_next(request)
    
    # Log the response
    process_time = time.time() - start_time
    logger.info(f"Response: {response.status_code} - {process_time:.2f}s [User: {user_id}]")
    
    return response

if __name__ == "__main__":
    print("Starting AI Chatbot API with History Management...")
    print("API will be available at: http://localhost:8080")
    print("Documentation available at: http://localhost:8080/docs")
    print("Alternative docs at: http://localhost:8080/redoc")
    print("Statistics available at: http://localhost:8080/stats")
    print("User history management enabled with cookies")
    
    # Run the FastAPI server
    uvicorn.run(
        "main:app",  # Change "main" to your filename if different
        host="0.0.0.0",
        port=8080,
        reload=True,  # Enable auto-reload for development
        log_level="info",
        access_log=True
    )
    