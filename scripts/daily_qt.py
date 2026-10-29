
import requests
from youtube_transcript_api import YouTubeTranscriptApi
import re, json, datetime

def get_latest_video_id():
    # Simple: fetch channel page
    url = "https://www.youtube.com/@pastor-kim-dong-ho"
    try:
        html = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}).text
        m = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        if m:
            return m.group(1)
    except Exception as e:
        print(f"Failed to get latest: {e}")
    return "RGYoYi56G_8"  # fallback

video_id = get_latest_video_id()
print(f"Latest video ID: {video_id}")

try:
    transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko','en'])
    full_text = ' '.join([x['text'] for x in transcript])
    with open(f"qt/{datetime.date.today()}.txt", "w", encoding="utf-8") as out:
        out.write(full_text)
    print("Saved transcript")
except Exception as e:
    print(f"Error: {e}")
