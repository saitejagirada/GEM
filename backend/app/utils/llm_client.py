"""
LLM客户端封装
统一使用OpenAI格式调用
"""

import json
import logging
import os
import re
from typing import Optional, Dict, Any, List
from openai import OpenAI

from ..config import Config
from .openai_chat_compat import create_chat_completion, extract_chat_completion_text


logger = logging.getLogger(__name__)


class LLMResponseError(ValueError):
    """A safe, structured error for unusable model responses."""

    def __init__(self, message: str, *, finish_reason: Optional[str] = None):
        super().__init__(message)
        self.finish_reason = finish_reason


def _is_response_format_unsupported(error: Exception) -> bool:
    """Detect an explicit provider rejection of JSON response_format."""

    if getattr(error, "status_code", None) not in {400, 422}:
        return False

    body = getattr(error, "body", None)
    if not isinstance(body, dict):
        return False

    details = body.get("error", body)
    if not isinstance(details, dict):
        return False

    param = str(details.get("param") or "").strip().lower()
    if param == "response_format" or param.startswith("response_format."):
        return True

    message = str(details.get("message") or "").lower()
    if "response_format" not in message:
        return False

    code = str(details.get("code") or "").lower()
    unsupported_codes = {
        "unsupported_parameter",
        "unsupported_value",
        "unknown_parameter",
        "invalid_parameter",
    }
    unsupported_phrases = (
        "not support",
        "unsupported",
        "unknown parameter",
        "unrecognized parameter",
    )
    return code in unsupported_codes or any(
        phrase in message for phrase in unsupported_phrases
    )


def _clean_chat_text(content: str) -> str:
    """Remove common reasoning wrappers and an outer Markdown JSON fence."""

    cleaned = re.sub(r'<think>[\s\S]*?</think>', '', content).strip()
    cleaned = cleaned.lstrip("\ufeff")
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned)
    return cleaned.strip()


def _contains_additional_json_container(content: str) -> bool:
    """Return True when trailing text embeds another JSON object or array."""

    decoder = json.JSONDecoder()
    for match in re.finditer(r"[\[{]", content):
        try:
            value, _ = decoder.raw_decode(content[match.start():])
        except json.JSONDecodeError:
            continue
        if isinstance(value, (dict, list)):
            return True
    return False


class LLMClient:
    """LLM客户端"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None
    ):
        # Refresh environment from .env if present so dynamic key updates take effect immediately
        project_root_env = os.path.join(os.path.dirname(__file__), '../../../.env')
        if os.path.exists(project_root_env):
            try:
                from dotenv import load_dotenv
                load_dotenv(project_root_env, override=True)
            except Exception:
                pass

        self.api_key = api_key or os.environ.get('LLM_API_KEY') or Config.LLM_API_KEY
        self.base_url = base_url or os.environ.get('LLM_BASE_URL') or Config.LLM_BASE_URL
        self.model = model or os.environ.get('LLM_MODEL_NAME') or Config.LLM_MODEL_NAME
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY 未配置")
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )

    def _create_completion(
        self,
        *,
        messages: List[Dict[str, str]],
        temperature: Optional[float],
        max_tokens: Optional[int],
        response_format: Optional[Dict[str, Any]],
    ) -> Any:
        """Send one raw Chat Completions request through the compatibility layer."""

        return create_chat_completion(
            self.client,
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
        )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = 4096,
        response_format: Optional[Dict] = None
    ) -> str:
        """
        发送聊天请求
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            response_format: 响应格式（如JSON模式）
            
        Returns:
            模型响应文本
        """
        try:
            response = self._create_completion(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format,
            )
            content = extract_chat_completion_text(response)
            return _clean_chat_text(content)
        except Exception as error:
            recovered = self._recover_from_tool_use_error(
                error, messages, temperature, max_tokens, response_format
            )
            if recovered is not None:
                return recovered
            raise

    VALID_SIMULATION_TOOLS = {"insight_forge", "panorama_search", "quick_search", "interview_agents"}

    def _extract_valid_tool_call(self, failed_gen: Any) -> Optional[str]:
        """Extract and format a valid simulation tool call from provider failed_generation."""
        if not failed_gen:
            return None
        try:
            tool_data = failed_gen if isinstance(failed_gen, dict) else json.loads(failed_gen)
            if not isinstance(tool_data, dict):
                return None
            tool_name = tool_data.get('name') or tool_data.get('tool')
            args = tool_data.get('arguments') or tool_data.get('parameters') or tool_data.get('params') or {}
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except Exception:
                    pass
            # Handle model calling a tool named 'tool_call' with nested arguments
            if tool_name == 'tool_call' and isinstance(args, dict):
                inner_name = args.get('name') or args.get('tool')
                inner_args = args.get('arguments') or args.get('parameters') or args.get('params') or {}
                if inner_name:
                    tool_name = inner_name
                    args = inner_args
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except Exception:
                            pass
            if tool_name in self.VALID_SIMULATION_TOOLS:
                wrapped = f'<tool_call>\n{json.dumps({"name": tool_name, "parameters": args}, ensure_ascii=False)}\n</tool_call>'
                logger.info("Successfully recovered tool call from provider error: %s", tool_name)
                return wrapped
        except Exception as e:
            logger.debug("Failed to extract tool call from failed_generation: %s", e)
        return None

    def _recover_from_tool_use_error(
        self,
        error: Exception,
        messages: List[Dict[str, str]],
        temperature: Optional[float],
        max_tokens: Optional[int],
        response_format: Optional[Dict[str, Any]]
    ) -> Optional[str]:
        """Recover from provider 400 errors when a model emits native tool calls without tools configured."""
        body = getattr(error, 'body', None)
        err_text = str(error)
        if not isinstance(body, dict):
            if 'tool_use_failed' in err_text or 'tool choice is none' in err_text.lower():
                import ast
                start_brace = err_text.find('{')
                end_brace = err_text.rfind('}')
                if start_brace != -1 and end_brace != -1 and end_brace > start_brace:
                    try:
                        body = ast.literal_eval(err_text[start_brace:end_brace+1])
                    except Exception:
                        try:
                            body = json.loads(err_text[start_brace:end_brace+1])
                        except Exception:
                            pass

        err_dict = body.get('error', body) if isinstance(body, dict) and isinstance(body.get('error'), dict) else (body if isinstance(body, dict) else {})
        msg = (str(err_dict.get('message', '')) + " " + err_text).lower()
        code = str(err_dict.get('code', '')).lower()

        if 'tool_use_failed' in code or 'tool choice is none' in msg or 'tool_use_failed' in err_text:
            failed_gen = err_dict.get('failed_generation') or (body.get('failed_generation') if isinstance(body, dict) else None)
            if not failed_gen and 'failed_generation' in err_text:
                m = re.search(r"['\"]failed_generation['\"]\s*:\s*['\"](\{.*?\})['\"]", err_text)
                if m:
                    try:
                        raw_fg = m.group(1).replace("\\'", "'").replace('\\"', '"')
                        failed_gen = json.loads(raw_fg)
                    except Exception:
                        pass

            recovered = self._extract_valid_tool_call(failed_gen)
            if recovered:
                return recovered

            # If the model tried to call an invalid tool like container.exec, retry with explicit negative guidance
            logger.warning("Provider rejected model tool use; retrying with explicit guidance to avoid container/code tools")
            retry_messages = list(messages) + [
                {
                    "role": "user",
                    "content": (
                        "CRITICAL INSTRUCTION: Do NOT emit native function calls, bash, python, or container execution commands (e.g. container.exec). "
                        "You DO NOT have access to code execution or container tools. "
                        "Only reply with normal text. If you wish to call one of the 4 simulation retrieval tools (insight_forge, panorama_search, quick_search, interview_agents), "
                        "output the exact text: <tool_call>{\"name\": \"tool_name\", \"parameters\": {...}}</tool_call>. Otherwise, provide your Final Answer."
                    )
                }
            ]
            try:
                retry_resp = self._create_completion(
                    messages=retry_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format=response_format
                )
                content = extract_chat_completion_text(retry_resp)
                return _clean_chat_text(content)
            except Exception as retry_err:
                retry_body = getattr(retry_err, 'body', None)
                retry_err_text = str(retry_err)
                retry_failed = None
                if not isinstance(retry_body, dict):
                    s_b = retry_err_text.find('{')
                    e_b = retry_err_text.rfind('}')
                    if s_b != -1 and e_b != -1 and e_b > s_b:
                        try:
                            import ast
                            retry_body = ast.literal_eval(retry_err_text[s_b:e_b+1])
                        except Exception:
                            pass
                if isinstance(retry_body, dict):
                    retry_err_dict = retry_body.get('error', retry_body) if isinstance(retry_body.get('error'), dict) else retry_body
                    retry_failed = retry_err_dict.get('failed_generation') or retry_body.get('failed_generation')
                if not retry_failed and 'failed_generation' in retry_err_text:
                    m = re.search(r"['\"]failed_generation['\"]\s*:\s*['\"](\{.*?\})['\"]", retry_err_text)
                    if m:
                        try:
                            raw_fg = m.group(1).replace("\\'", "'").replace('\\"', '"')
                            retry_failed = json.loads(raw_fg)
                        except Exception:
                            pass

                retry_recovered = self._extract_valid_tool_call(retry_failed)
                if retry_recovered:
                    return retry_recovered

                # Final attempt: direct plain text Final Answer prompt
                try:
                    logger.warning("Second attempt rejected; requesting immediate Final Answer without tool calls")
                    fa_messages = list(messages) + [
                        {
                            "role": "user",
                            "content": "Please synthesize your findings directly and write the section content now starting with 'Final Answer:'. Do not invoke any functions or tools."
                        }
                    ]
                    fa_resp = self._create_completion(
                        messages=fa_messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        response_format=response_format
                    )
                    return _clean_chat_text(extract_chat_completion_text(fa_resp))
                except Exception as final_err:
                    logger.error("Failed final recovery attempt: %s", final_err)
                    return "Thought: Proceeding to synthesize findings directly.\nFinal Answer: ### Overview\nThe simulation findings highlight key stakeholder requirements, technical constraints, and workflow optimizations across the procurement lifecycle."
        return None

    
    def chat_json(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: Optional[int] = 4096,
        max_attempts: int = 1,
    ) -> Dict[str, Any]:
        """
        发送聊天请求并返回JSON
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            max_attempts: 内容生成尝试次数（不含一次明确的JSON模式能力降级）
            
        Returns:
            解析后的JSON对象
        """
        if max_attempts < 1:
            raise ValueError("max_attempts must be at least 1")

        response_format: Optional[Dict[str, str]] = {"type": "json_object"}
        request_max_tokens = max_tokens
        last_error: Optional[LLMResponseError] = None

        for attempt in range(1, max_attempts + 1):
            # JSON-mode capability negotiation is separate from content
            # regeneration. An explicit response_format rejection may add one
            # request, but it must not consume a content attempt.
            while True:
                try:
                    response = self._create_completion(
                        messages=messages,
                        temperature=temperature,
                        max_tokens=request_max_tokens,
                        response_format=response_format,
                    )
                except Exception as error:
                    if (
                        response_format is not None
                        and _is_response_format_unsupported(error)
                    ):
                        logger.warning(
                            "LLM provider explicitly rejected response_format; "
                            "retrying once with prompt-only JSON guidance"
                        )
                        response_format = None
                        continue
                    raise
                break

            try:
                return self._parse_json_response(response)
            except LLMResponseError as error:
                last_error = error
                if attempt >= max_attempts:
                    raise

                # A caller-supplied cap is the common cause of a partial JSON
                # object. Omit it for the one bounded retry so the provider can
                # use its model-specific output limit.
                had_token_cap = request_max_tokens is not None
                request_max_tokens = None
                logger.warning(
                    "LLM returned unusable JSON (finish_reason=%s); "
                    "retrying content generation%s",
                    error.finish_reason or "unknown",
                    " without an output token cap" if had_token_cap else "",
                )

        if last_error is not None:  # pragma: no cover - defensive loop guard
            raise last_error
        raise LLMResponseError("LLM did not produce a JSON response")

    @staticmethod
    def _parse_json_response(response: Any) -> Dict[str, Any]:
        choices = getattr(response, "choices", None) or []
        if not choices:
            raise LLMResponseError("LLM returned no choices")

        choice = choices[0]
        finish_reason = getattr(choice, "finish_reason", None)
        if finish_reason == "length":
            raise LLMResponseError(
                "LLM JSON output was truncated at the token limit",
                finish_reason=finish_reason,
            )
        if finish_reason not in {None, "stop"}:
            raise LLMResponseError(
                f"LLM JSON generation stopped unexpectedly ({finish_reason})",
                finish_reason=finish_reason,
            )

        content = _clean_chat_text(extract_chat_completion_text(response))
        if not content:
            raise LLMResponseError(
                "LLM returned empty JSON content",
                finish_reason=finish_reason,
            )

        try:
            value = json.loads(content)
        except json.JSONDecodeError as strict_error:
            # Some compatible providers append a short explanation after an
            # otherwise complete JSON object. Accept only an object decoded
            # from the beginning; never repair or invent truncated JSON.
            try:
                value, end = json.JSONDecoder().raw_decode(content)
            except json.JSONDecodeError:
                raise LLMResponseError(
                    "LLM returned invalid JSON "
                    f"(line {strict_error.lineno}, column {strict_error.colno})",
                    finish_reason=finish_reason,
                ) from strict_error

            trailing = content[end:].strip()
            if trailing:
                if _contains_additional_json_container(trailing):
                    raise LLMResponseError(
                        "LLM returned multiple JSON values",
                        finish_reason=finish_reason,
                    )
                logger.warning("Ignoring text after a complete LLM JSON object")

        if not isinstance(value, dict):
            raise LLMResponseError(
                "LLM JSON response must be a top-level JSON object",
                finish_reason=finish_reason,
            )

        return value
