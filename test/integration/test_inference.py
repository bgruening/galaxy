from unittest.mock import (
    AsyncMock,
    MagicMock,
    patch,
)

import pytest

from galaxy_test.driver.integration_util import IntegrationTestCase

pytest.importorskip("openai")


class TestInferenceAPI(IntegrationTestCase):
    @classmethod
    def handle_galaxy_config_kwds(cls, config) -> None:
        config["ai_api_key"] = "global-key"
        config["ai_api_base_url"] = "http://global-url"
        config["ai_model"] = "global-model"
        config["inference_services"] = {
            "default": {
                "model": "default-model",
                "api_key": "default-key",
                "api_base_url": "http://default-url",
                "temperature": 0.2,
            },
            "loom": {
                "model": "loom-model",
                "api_key": "loom-key",
                "api_base_url": "http://loom-url",
                "max_tokens": 4096,
            },
        }

    @patch("galaxy.webapps.galaxy.api.inference.AsyncOpenAI")
    def test_loom_inference_preserves_messages_and_uses_service_config(self, mock_client):
        mock_response = MagicMock()
        mock_response.model_dump.return_value = {"id": "test", "choices": []}
        mock_instance = MagicMock()
        mock_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_instance.close = AsyncMock()
        mock_client.return_value = mock_instance

        payload = {
            "messages": [
                {"role": "system", "content": "Loom owns the agent loop."},
                {"role": "assistant", "tool_calls": [{"id": "call-1", "type": "function"}]},
                {"role": "tool", "tool_call_id": "call-1", "content": "result"},
            ],
            "tools": [{"type": "function", "function": {"name": "run", "parameters": {"type": "object"}}}],
        }
        response = self._post("inference/loom/chat/completions", payload, json=True)
        self._assert_status_code_is(response, 200)

        client_kwargs = mock_client.call_args.kwargs
        assert client_kwargs["api_key"] == "loom-key"
        assert client_kwargs["base_url"] == "http://loom-url"
        call_kwargs = mock_instance.chat.completions.create.call_args.kwargs
        assert call_kwargs["model"] == "loom-model"
        assert call_kwargs["max_tokens"] == 4096
        assert call_kwargs["temperature"] == 0.2
        assert call_kwargs["messages"][0]["role"] == "system"
        assert call_kwargs["messages"][2]["tool_call_id"] == "call-1"

    def test_message_content_blocks_are_rejected(self):
        payload = {"messages": [{"role": "user", "content": [{"type": "text", "text": "hello"}]}]}
        response = self._post("inference/loom/chat/completions", payload, json=True)
        self._assert_status_code_is(response, 400)
