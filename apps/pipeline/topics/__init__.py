from typing import Protocol, Any


class TopicPlugin(Protocol):
    def collect(self, date: str, region: str) -> tuple[dict, dict]:
        ...

    def validate(
        self, facts: dict, sources: dict, region: str, previous_facts: dict | None
    ) -> tuple[list[str], list[dict]]:
        ...

    def compose(
        self,
        facts: dict,
        sources: dict,
        channel: str,
        memory: Any,
        region: str,
        format_id: int,
        mode: str,
        changes: list[dict] | None,
    ) -> str:
        ...

    def publish(self, content: str, mode: str, memory: Any) -> dict:
        ...
