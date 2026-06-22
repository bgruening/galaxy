"""Prompt-neutral, OpenAI-compatible inference for external Galaxy clients."""

import json
import logging
from typing import (
    Any,
    cast,
    Literal,
    Optional,
)

from fastapi import (
    Body,
    Request,
)
from fastapi.responses import JSONResponse
from openai import (
    APIError,
    AsyncOpenAI,
)
from openai._streaming import AsyncStream
from openai.types.chat import (
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionMessageParam,
    ChatCompletionToolParam,
)
from pydantic import BaseModel

from galaxy.config import GalaxyAppConfiguration
from galaxy.model import User
from galaxy.webapps.base.api import GalaxyStreamingResponse
from galaxy.webapps.galaxy.api import (
    depends,
    DependsOnTrans,
    DependsOnUser,
    Router,
)
from galaxy.webapps.galaxy.fast_app import limiter
from galaxy.work.context import SessionRequestContext

log = logging.getLogger(__name__)

router = Router(tags=["inference"])

INFERENCE_SERVICE_NAME = "loom"
MAX_MESSAGES = 1024
MAX_TOOLS = 128
MAX_TOOL_BYTES = 16384
TIMEOUT = 120.0
TOKENS_DEFAULT = 1024
TOKENS_MAX = 8192
TEMPERATURE_DEFAULT = 0.3
TOP_P_DEFAULT = 0.9


class ChatMessage(BaseModel):
    role: Literal["assistant", "system", "tool", "user"]
    content: Optional[str] = None
    tool_calls: Optional[list[dict[str, Any]]] = None
    model_config = dict(extra="allow")


class ChatToolFunction(BaseModel):
    name: str
    model_config = dict(extra="allow")


class ChatTool(BaseModel):
    type: Literal["function"]
    function: ChatToolFunction
    model_config = dict(extra="allow")


class ChatCompletionRequest(BaseModel):
    messages: list[ChatMessage]
    tools: Optional[list[ChatTool]] = None
    stream: Optional[bool] = False
    max_tokens: Optional[int] = None
    model_config = dict(extra="allow")


@router.cbv
class InferenceAPI:
    """Raw model inference that keeps the calling application in control of its agent loop."""

    config: GalaxyAppConfiguration = depends(GalaxyAppConfiguration)

    @router.post("/api/inference/loom/chat/completions", unstable=True)
    @limiter.limit("30/minute")
    async def chat_completions(
        self,
        request: Request,
        payload: ChatCompletionRequest = Body(...),
        user: User = DependsOnUser,
        trans: SessionRequestContext = DependsOnTrans,
    ):
        """Proxy an OpenAI-compatible chat completion through Galaxy's Loom inference service."""
        service_config = self._service_config()
        if service_config.get("enabled") is False:
            return self._error("Loom inference service is disabled.", 403)
        api_key = service_config.get("api_key")
        model = service_config.get("model")
        if not api_key:
            return self._error("AI service not configured: API key is required.")
        if not model:
            return self._error("AI service not configured: Model is required.")

        messages_or_error = self._messages(payload.messages)
        if isinstance(messages_or_error, JSONResponse):
            return messages_or_error
        tools_or_error = self._tools(payload.tools or [])
        if isinstance(tools_or_error, JSONResponse):
            return tools_or_error

        configured_max_tokens = service_config.get("max_tokens", TOKENS_DEFAULT)
        try:
            token_default = int(configured_max_tokens)
        except (TypeError, ValueError):
            token_default = TOKENS_DEFAULT
        max_tokens = min(payload.max_tokens or token_default, TOKENS_MAX)

        try:
            client = AsyncOpenAI(
                api_key=api_key,
                timeout=TIMEOUT,
                base_url=service_config.get("api_base_url") or None,
            )
        except Exception as exc:
            log.debug("Failed to initialize OpenAI client.", exc_info=exc)
            return self._error("Failed to initialize OpenAI client.", 500)

        trans.sa_session().close()
        try:
            response = await client.chat.completions.create(
                max_tokens=max_tokens,
                messages=messages_or_error,
                model=model,
                stream=payload.stream is True,
                temperature=service_config.get("temperature", TEMPERATURE_DEFAULT),
                tools=tools_or_error,
                top_p=service_config.get("top_p", TOP_P_DEFAULT),
            )
        except APIError as exc:
            await client.close()
            log.debug("Failed to complete OpenAI request.", exc_info=exc)
            status_code = getattr(exc, "status_code", 500)
            if hasattr(exc, "body") and isinstance(exc.body, dict):
                return JSONResponse(content=dict(error=exc.body), status_code=status_code)
            return self._error("Failed to complete OpenAI request.", status_code)

        if payload.stream is True:
            stream_response = cast(AsyncStream[ChatCompletionChunk], response)

            async def generate():
                try:
                    async for chunk in stream_response:
                        yield f"data: {json.dumps(chunk.model_dump())}\n\n"
                    yield "data: [DONE]\n\n"
                finally:
                    await client.close()

            return GalaxyStreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )

        await client.close()
        completion = cast(ChatCompletion, response)
        return JSONResponse(content=completion.model_dump())

    def _service_config(self) -> dict[str, Any]:
        inference_services = getattr(self.config, "inference_services", None)
        if isinstance(inference_services, dict):
            default = inference_services.get("default")
            resolved = dict(default) if isinstance(default, dict) else {}
            loom = inference_services.get(INFERENCE_SERVICE_NAME)
            if isinstance(loom, dict):
                resolved.update(loom)
        else:
            resolved = {}

        fallbacks = {
            "model": self.config.ai_model,
            "api_key": self.config.ai_api_key,
            "api_base_url": self.config.ai_api_base_url,
        }
        for key, value in fallbacks.items():
            if key not in resolved and value is not None:
                resolved[key] = value
        return resolved

    def _messages(self, messages: list[ChatMessage]):
        if len(messages) > MAX_MESSAGES:
            return self._error("You have exceeded the number of maximum messages.")
        normalized: list[ChatCompletionMessageParam] = []
        for message in messages:
            value = message.model_dump(exclude_none=True)
            if message.role in ("system", "user", "tool") and not isinstance(message.content, str):
                return self._error(f"Message content is required for role '{message.role}'.")
            if message.role == "assistant" and not message.content and not message.tool_calls:
                return self._error("Assistant messages require content or tool_calls.")
            normalized.append(cast(ChatCompletionMessageParam, value))
        return normalized

    def _tools(self, tools: list[ChatTool]):
        if len(tools) > MAX_TOOLS:
            return self._error("Number of tools exceeded or invalid tools list.")
        normalized: list[ChatCompletionToolParam] = []
        for tool in tools:
            value = tool.model_dump()
            function = value.get("function", {})
            if function.get("parameters") is None:
                function["parameters"] = {"type": "object", "properties": {}}
            size = len(json.dumps(value, separators=(",", ":")).encode("utf-8"))
            if size > MAX_TOOL_BYTES:
                return self._error("Tool schema too large.")
            normalized.append(cast(ChatCompletionToolParam, value))
        return normalized

    def _error(self, message: str, status_code: int = 400):
        log.debug(message)
        return JSONResponse(content=dict(error=dict(message=message)), status_code=status_code)
