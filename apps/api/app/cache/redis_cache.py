import json
import logging

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)


async def get_cached(key: str) -> dict[str, object] | None:
    """Return a cached dict for key, or None if not present / on error."""
    try:
        redis_client: aioredis.Redis = aioredis.from_url(settings.redis_url)
        async with redis_client:
            raw = await redis_client.get(key)
        if raw is None:
            return None
        return json.loads(raw)  # type: ignore[no-any-return]
    except Exception as exc:
        logger.warning("Redis get error for key %r: %s", key, exc)
        return None


async def set_cached(key: str, value: dict[str, object], ttl: int) -> None:
    """Persist value as JSON at key with the given TTL (seconds). Logs and swallows errors."""
    try:
        redis_client: aioredis.Redis = aioredis.from_url(settings.redis_url)
        async with redis_client:
            await redis_client.setex(key, ttl, json.dumps(value))
    except Exception as exc:
        logger.warning("Redis set error for key %r: %s", key, exc)
