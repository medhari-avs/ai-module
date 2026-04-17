import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

from core.database import init_db
from routers import meeting, signaling, calendar, transcribe


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

init_db()

app = FastAPI(
    title="Shnoor Meetings Backend",
    description="Backend Signaling & Chat server for Shnoor Meetings (WebRTC)",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(meeting.router)
app.include_router(signaling.router)
app.include_router(calendar.router)
app.include_router(transcribe.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Shnoor Meetings API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
