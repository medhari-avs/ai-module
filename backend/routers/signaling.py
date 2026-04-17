import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/{room_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    await manager.connect(websocket, room_id, client_id)
    
    await manager.broadcast_to_room(room_id, {
        "type": "user-joined",
        "client_id": client_id,
        "message": f"User {client_id} joined the meeting"
    }, sender=websocket)

    try:
        while True:
           
            data = await websocket.receive_json()
            
            msg_type = data.get("type")
            target_id = data.get("target")

            
            message_to_send = {
                "type": msg_type,
                "sender": client_id,
                **data
            }
            
            if target_id:
                pass

            await manager.broadcast_to_room(room_id, message_to_send, sender=websocket)

            if msg_type == "chat" and data.get("text", "").lower().startswith("@ai"):
                prompt = data.get("text")[3:].strip()
                ai_response_text = f"Beep boop! This is Shnoor AI. You asked: '{prompt}'."
                
                await manager.broadcast_to_room(room_id, ai_message)
                await websocket.send_json(ai_message)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        await manager.broadcast_to_room(room_id, {
            "type": "user-left",
            "client_id": client_id,
            "message": f"User {client_id} left the meeting"
        })
        logger.info(f"Client {client_id} disconnected from room {room_id}")
    except Exception as e:
        logger.error(f"Error in websocket for client {client_id}: {e}")
        manager.disconnect(websocket, room_id)
