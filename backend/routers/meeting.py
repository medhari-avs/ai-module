import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.database import get_db_connection

router = APIRouter(
    prefix="/api/meetings",
    tags=["Meetings"]
)


class CreateMeetingRequest(BaseModel):
    host_name: str = "Host"


class CreateMeetingResponse(BaseModel):
    room_id: str
    message: str


class JoinMeetingRequest(BaseModel):
    display_name: str


class ParticipantResponse(BaseModel):
    display_name: str
    joined_at: str
    left_at: Optional[str] = None


class MeetingHistoryItem(BaseModel):
    room_id: str
    host_name: str
    status: str
    created_at: str
    ended_at: Optional[str] = None
    participants: List[str] = []


@router.post("/create", response_model=CreateMeetingResponse)
async def create_meeting(body: CreateMeetingRequest = None):
    room_id = str(uuid.uuid4())
    host_name = body.host_name if body else "Host"

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO meetings (room_id, host_name) VALUES (%s, %s)",
                (room_id, host_name)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create meeting: {e}")
    finally:
        conn.close()

    return {"room_id": room_id, "message": "Meeting created successfully"}


@router.post("/{room_id}/join")
async def join_meeting(room_id: str, body: JoinMeetingRequest):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT room_id FROM meetings WHERE room_id = %s", (room_id,))
            existing = cur.fetchone()
            if not existing:
                cur.execute(
                    "INSERT INTO meetings (room_id, host_name) VALUES (%s, %s) ON CONFLICT (room_id) DO NOTHING",
                    (room_id, body.display_name)
                )

            cur.execute(
                "INSERT INTO meeting_participants (room_id, display_name) VALUES (%s, %s)",
                (room_id, body.display_name)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to join meeting: {e}")
    finally:
        conn.close()

    return {"message": f"{body.display_name} joined successfully"}


@router.post("/{room_id}/leave")
async def leave_meeting(room_id: str, body: JoinMeetingRequest):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE meeting_participants 
                SET left_at = NOW() 
                WHERE room_id = %s AND display_name = %s AND left_at IS NULL
                """,
                (room_id, body.display_name)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record leave: {e}")
    finally:
        conn.close()

    return {"message": "Left meeting recorded"}


@router.post("/{room_id}/end")
async def end_meeting(room_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE meetings SET status = 'ended', ended_at = NOW() WHERE room_id = %s",
                (room_id,)
            )
            cur.execute(
                "UPDATE meeting_participants SET left_at = NOW() WHERE room_id = %s AND left_at IS NULL",
                (room_id,)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to end meeting: {e}")
    finally:
        conn.close()

    return {"message": "Meeting ended"}


@router.get("/history", response_model=List[MeetingHistoryItem])
async def get_call_history():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    m.room_id,
                    m.host_name,
                    m.status,
                    m.created_at::TEXT,
                    m.ended_at::TEXT,
                    COALESCE(
                        ARRAY_AGG(mp.display_name ORDER BY mp.joined_at) 
                        FILTER (WHERE mp.display_name IS NOT NULL), 
                        '{}'
                    ) AS participants
                FROM meetings m
                LEFT JOIN meeting_participants mp ON m.room_id = mp.room_id
                GROUP BY m.room_id, m.host_name, m.status, m.created_at, m.ended_at
                ORDER BY m.created_at DESC
                LIMIT 50
            """)
            rows = cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {e}")
    finally:
        conn.close()

    return [
        MeetingHistoryItem(
            room_id=row["room_id"],
            host_name=row["host_name"],
            status=row["status"],
            created_at=row["created_at"],
            ended_at=row["ended_at"],
            participants=list(row["participants"]) if row["participants"] else []
        )
        for row in rows
    ]


@router.get("/{room_id}")
async def check_meeting(room_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT room_id, status FROM meetings WHERE room_id = %s", (room_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        return {"room_id": room_id, "valid": True, "status": "new"}
    return {"room_id": row["room_id"], "valid": True, "status": row["status"]}
