import json
import os
import urllib.request


class KnowledgeBase:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.docs_dir = os.path.join(base_dir, "docs")
        self.rag_api_url = os.getenv("RAG_API_URL", "").rstrip("/")

    def query(self, question):
        if self.rag_api_url:
            result = self._query_rag(question)
            if result:
                return result
        return self._query_local_docs(question)

    def _query_rag(self, question):
        try:
            payload = json.dumps({"query": question}).encode("utf-8")
            req = urllib.request.Request(
                f"{self.rag_api_url}/query",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode("utf-8"))
                return data.get("answer") or data.get("result")
        except Exception:
            return ""

    def _query_local_docs(self, question):
        if not os.path.isdir(self.docs_dir):
            return ""
        tokens = {token for token in question.lower().split() if token}
        best_score = 0
        best_text = ""
        for name in os.listdir(self.docs_dir):
            if not name.endswith(".md"):
                continue
            path = os.path.join(self.docs_dir, name)
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
            score = sum(1 for token in tokens if token in text.lower())
            if score > best_score:
                best_score = score
                best_text = text.strip()
        return best_text[:500] if best_text else ""
