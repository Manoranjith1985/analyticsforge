"""
orm_helpers.py — Safe ORM → dict conversion for FastAPI responses.

Converts all UUID, Enum, and other non-JSON-native types to plain Python
primitives so Pydantic / FastAPI serialisation never crashes.
"""
import uuid
import enum
from typing import Any


def orm_to_dict(obj: Any, fields: list[str]) -> dict:
    """
    Extract `fields` from an ORM object and return a plain dict.
    UUID  → str
    Enum  → str (value)
    None  → None
    Everything else → as-is
    """
    result = {}
    for f in fields:
        val = getattr(obj, f, None)
        if isinstance(val, uuid.UUID):
            result[f] = str(val)
        elif isinstance(val, enum.Enum):
            result[f] = val.value
        else:
            result[f] = val
    return result
