import requests


class LineClient:
    def __init__(self, access_token: str):
        self.access_token = access_token

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def reply_message(self, reply_token: str, text: str) -> None:
        url = "https://api.line.me/v2/bot/message/reply"
        payload = {"replyToken": reply_token, "messages": [{"type": "text", "text": text}]}
        resp = requests.post(url, headers=self._headers(), json=payload, timeout=10)
        if resp.status_code != 200:
            raise RuntimeError(f"LINE reply failed: {resp.status_code} {resp.text}")

    def push_message(self, user_id: str, text: str) -> None:
        url = "https://api.line.me/v2/bot/message/push"
        payload = {"to": user_id, "messages": [{"type": "text", "text": text}]}
        resp = requests.post(url, headers=self._headers(), json=payload, timeout=10)
        if resp.status_code != 200:
            raise RuntimeError(f"LINE push failed: {resp.status_code} {resp.text}")
