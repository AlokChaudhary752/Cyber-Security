from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class SecurityEvent:
    identifier: str
    id_type: Literal["ip", "user", "api_key"]
    event_type: str
    timestamp: int