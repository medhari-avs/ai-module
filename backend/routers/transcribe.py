import os
import aiofiles
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from faster_whisper import WhisperModel
import asyncio
from core.connection_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()

MODEL_SIZE = "tiny"
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

@router.websocket("/ws/transcribe/{room_id}/{client_id}")
async def websocket_transcribe_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    await websocket.accept()
    logger.info(f"Transcription connection opened for {client_id} in {room_id}")

    try:
        while True:
            audio_bytes = await websocket.receive_bytes()
            
            temp_file = f"temp_{client_id}.webm"
            
            async with aiofiles.open(temp_file, "wb") as f:
                await f.write(audio_bytes)

            try:
                segments, info = model.transcribe(temp_file, beam_size=5)
                text = " ".join([segment.text for segment in segments]).strip()
                
                if text:
                    caption_msg = {
                        "type": "caption",
                        "client_id": client_id,
                        "text": text
                    }
                    await manager.broadcast_to_room(room_id, caption_msg)
            except Exception as e:
                logger.error(f"Transcription error: {e}")
            
    except WebSocketDisconnect:
        logger.info(f"Transcription client {client_id} disconnected.")
    except Exception as e:
        logger.error(f"Transcribe websocket error: {e}")
    finally:
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except:
                pass
