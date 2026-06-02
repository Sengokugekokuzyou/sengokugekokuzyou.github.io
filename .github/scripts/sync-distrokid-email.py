import email
import hashlib
import imaplib
import json
import os
import re
from datetime import datetime, timedelta, timezone
from email.header import decode_header
from email.utils import parsedate_to_datetime
from pathlib import Path


NEWS_PATH = Path("news.json")
STATE_PATH = Path(".music-release-state/distrokid-email.json")

APPLE_MUSIC_ARTIST_URL = os.getenv(
    "APPLE_MUSIC_ARTIST_URL",
    "https://music.apple.com/us/artist/sengoku-gekokujo-beats/1888867608",
)
SPOTIFY_ARTIST_URL = os.getenv(
    "SPOTIFY_ARTIST_URL",
    "https://open.spotify.com/intl-ja/artist/3WQ99kHfRU1IwI7l5dBqVL",
)

PUBLIC_KEYWORDS = [
    "available",
    "delivered",
    "distributed",
    "live",
    "released",
    "sent to stores",
    "streaming",
    "配信",
    "公開",
    "反映",
    "完了",
]

BLOCK_KEYWORDS = [
    "action required",
    "blocked",
    "copyright",
    "error",
    "failed",
    "fix",
    "payment",
    "problem",
    "rejected",
    "takedown",
    "warning",
    "エラー",
    "拒否",
    "修正",
    "失敗",
    "問題",
]


def main():
    host = os.getenv("DISTROKID_IMAP_HOST", "")
    user = os.getenv("DISTROKID_IMAP_USER", "")
    password = os.getenv("DISTROKID_IMAP_PASSWORD", "")
    port = int(os.getenv("DISTROKID_IMAP_PORT", "993"))
    mailbox = os.getenv("DISTROKID_IMAP_MAILBOX", "INBOX")

    if not host or not user or not password:
        print("DistroKid IMAP secrets are not set. Skipping email sync.")
        return

    state = read_json(STATE_PATH, {"knownMessageKeys": []})
    known = set(state.get("knownMessageKeys", []))
    messages = fetch_distrokid_messages(host, port, user, password, mailbox)
    candidates = [message for message in messages if is_public_release_notice(message)]

    news = read_json(NEWS_PATH, {"updates": []})
    updates = news.get("updates", [])
    existing_ids = {item.get("id") for item in updates}
    new_updates = []

    for message in candidates:
        key = message["key"]
        if key in known:
            continue

        news_id = f"distrokid-email-{key[:12]}"
        if news_id in existing_ids:
            continue

        release_title = extract_release_title(message["subject"])
        new_updates.insert(
            0,
            {
                "id": news_id,
                "date": message["date"][:10],
                "category": "音楽配信",
                "title": f"配信更新: {release_title}",
                "body": build_body(),
                "url": APPLE_MUSIC_ARTIST_URL,
                "approved": True,
                "discord": True,
                "source": "distrokid-email",
                "artist": "Sengoku Gekokujo BEATS",
                "emailSubject": message["subject"],
                "appleMusicArtistUrl": APPLE_MUSIC_ARTIST_URL,
                "spotifyArtistUrl": SPOTIFY_ARTIST_URL,
            },
        )

    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(
            {
                "checkedAt": datetime.now(timezone.utc).isoformat(),
                "knownMessageKeys": sorted({message["key"] for message in messages} | known),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    if not new_updates:
        print("No new DistroKid release notices.")
        return

    news["updates"] = new_updates + updates
    NEWS_PATH.write_text(json.dumps(news, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Added {len(new_updates)} DistroKid email update(s).")


def fetch_distrokid_messages(host, port, user, password, mailbox):
    since_days = int(os.getenv("DISTROKID_EMAIL_SINCE_DAYS", "45"))
    max_messages = int(os.getenv("DISTROKID_EMAIL_MAX_MESSAGES", "50"))
    since_date = (datetime.now(timezone.utc) - timedelta(days=since_days)).strftime("%d-%b-%Y")

    with imaplib.IMAP4_SSL(host, port) as imap:
        imap.login(user, password)
        imap.select(mailbox)
        status, data = imap.search(None, "SINCE", since_date)
        if status != "OK":
            raise RuntimeError(f"IMAP search failed: {status}")

        ids = data[0].split()[-max_messages:]
        messages = []
        for message_id in ids:
            status, payload = imap.fetch(message_id, "(RFC822)")
            if status != "OK" or not payload or not payload[0]:
                continue
            raw = payload[0][1]
            parsed = email.message_from_bytes(raw)
            sender = decode_value(parsed.get("From", ""))
            subject = decode_value(parsed.get("Subject", ""))
            if "distrokid" not in sender.lower() and "distrokid" not in subject.lower():
                continue

            message_date = parse_date(parsed.get("Date"))
            message_key = parsed.get("Message-ID") or f"{sender}|{subject}|{message_date}"
            messages.append(
                {
                    "key": stable_key(message_key),
                    "sender": sender,
                    "subject": subject,
                    "date": message_date,
                },
            )

        imap.logout()
        return sorted(messages, key=lambda item: item["date"])


def is_public_release_notice(message):
    text = f"{message['sender']} {message['subject']}".lower()
    if any(keyword in text for keyword in BLOCK_KEYWORDS):
        return False
    return any(keyword in text for keyword in PUBLIC_KEYWORDS)


def extract_release_title(subject):
    cleaned = re.sub(r"\s+", " ", subject).strip()
    cleaned = re.sub(r"(?i)^distrokid\s*[:\-]\s*", "", cleaned)
    cleaned = re.sub(r"(?i)\s*[-–—]\s*distrokid\s*$", "", cleaned)
    return cleaned or "Sengoku Gekokujo BEATS"


def build_body():
    lines = [
        "DistroKidから配信反映メールを確認しました。",
        "各ストアで順次反映されます。",
        f"Apple Music: {APPLE_MUSIC_ARTIST_URL}",
    ]
    if SPOTIFY_ARTIST_URL:
        lines.append(f"Spotify: {SPOTIFY_ARTIST_URL}")
    return "\n".join(lines)


def parse_date(value):
    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def decode_value(value):
    parts = decode_header(value)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(part)
    return "".join(decoded)


def stable_key(value):
    return hashlib.sha256(value.encode("utf-8", errors="replace")).hexdigest()


def read_json(path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
