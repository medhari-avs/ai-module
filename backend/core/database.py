import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs, unquote

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env file!")


def _parse_db_url(url: str) -> dict:
    parsed = urlparse(url)
    params = {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "dbname": parsed.path.lstrip("/"),
        "user": unquote(parsed.username),
        "password": unquote(parsed.password),
    }

    if parsed.query:
        qs = parse_qs(parsed.query)
        if "sslmode" in qs:
            params["sslmode"] = qs["sslmode"][0]
    return params


def get_db_connection():
    conn = psycopg2.connect(**_parse_db_url(DATABASE_URL), cursor_factory=RealDictCursor)
    conn.autocommit = False
    return conn


def init_db():
    try:
        conn = get_db_connection()
    except Exception as e:
        print(f"WARNING: DB not reachable at startup (tables already exist on Supabase): {e}")
        print("WARNING: Server will still start. Fix DATABASE_URL in .env to restore full DB access.")
        return
    try:
        with conn.cursor() as cur:
           
            cur.execute("""
                CREATE TABLE IF NOT EXISTS meetings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    room_id TEXT UNIQUE NOT NULL,
                    host_name TEXT NOT NULL DEFAULT 'Host',
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    ended_at TIMESTAMPTZ
                );
            """)

           
            cur.execute("""
                CREATE TABLE IF NOT EXISTS meeting_participants (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    room_id TEXT NOT NULL REFERENCES meetings(room_id) ON DELETE CASCADE,
                    display_name TEXT NOT NULL,
                    joined_at TIMESTAMPTZ DEFAULT NOW(),
                    left_at TIMESTAMPTZ
                );
            """)

            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    start_time TIMESTAMPTZ NOT NULL,
                    end_time TIMESTAMPTZ NOT NULL,
                    room_id TEXT NOT NULL,
                    host_name TEXT NOT NULL DEFAULT 'Host',
                    invite_emails TEXT[] DEFAULT '{}',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)

            conn.commit()
            print("OK: Supabase PostgreSQL tables initialised successfully.")
    except Exception as e:
        conn.rollback()
        print(f" Database init error: {e}")
        raise
    finally:
        conn.close()
