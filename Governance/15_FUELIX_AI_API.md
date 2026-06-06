# Fuel iX API Reference

## Endpoint

```
POST https://api.fuelix.ai/v1/chat/completions
```

## Headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer YOUR_SECRET_TOKEN` |

---

## Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | string | ✅ | Model ID to use |
| `messages` | array | ✅ | List of conversation messages |
| `temperature` | number | ❌ | Randomness 0–2, default `1` |
| `max_tokens` | integer | ❌ | Max tokens to generate |
| `stream` | boolean | ❌ | Stream response via SSE if `true` |
| `top_p` | number | ❌ | Nucleus sampling, default `1` |
| `n` | integer | ❌ | How many completions to generate |
| `stop` | string/array | ❌ | Stop sequence(s) |
| `presence_penalty` | number | ❌ | -2.0 to 2.0, penalizes new topics |
| `frequency_penalty` | number | ❌ | -2.0 to 2.0, penalizes repetition |
| `user` | string | ❌ | End-user identifier for tracking |

---

## Message Roles

```json
{ "role": "system",    "content": "You are a helpful assistant." }
{ "role": "user",      "content": "What is the capital of France?" }
{ "role": "assistant", "content": "Paris." }
```

---

## Full Example (Python)

```python
import requests

response = requests.post(
    "https://api.fuelix.ai/v1/chat/completions",
    headers={
        "Authorization": "Bearer YOUR_SECRET_TOKEN",
        "Content-Type": "application/json"
    },
    json={
        "model": "claude-sonnet-4-6",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user",   "content": "Summarize this for me."}
        ],
        "temperature": 0.3,
        "max_tokens": 1024
    }
)

print(response.json()["choices"][0]["message"]["content"])
```

---

## Available Models

### Anthropic

| Model | Notes |
|---|---|
| `claude-sonnet-4-6` | Latest Claude, best for general use |
| `claude-sonnet-4` / `claude-sonnet-4-20250514` | Stable Sonnet 4 |
| `claude-sonnet-4-5` / `claude-sonnet-4-5-20250929` | Sonnet 4.5 |
| `claude-haiku-4-5` / `claude-haiku-4-5-20251001` | Fast & cheap |
| `claude-haiku-4` | Haiku 4 |
| `claude-3-7-sonnet` / `claude-3-7-sonnet-20250219` | Sonnet 3.7 |
| `claude-3-5-sonnet` / `claude-3-5-sonnet-20241022` | Sonnet 3.5 |
| `claude-3-5-haiku` / `claude-3-5-haiku-20241022` | Haiku 3.5 |

### OpenAI

| Model | Notes |
|---|---|
| `gpt-5` / `gpt-5-2025-08-07` | Latest GPT-5 |
| `gpt-4.1` / `gpt-4.1-2025-04-14` | GPT-4.1 |
| `gpt-4.1-mini` | Smaller GPT-4.1 |
| `gpt-4.1-nano` | Nano variant |
| `gpt-4o` / `gpt-4o-2024-11-20` | GPT-4o |
| `gpt-4o-mini` | Fast & cheap GPT-4o |
| `o3` | Advanced reasoning |
| `o3-mini` / `o3-mini-2025-01-31` | Smaller o3 |
| `o4-mini` | o4 mini reasoning |

### Google

| Model | Notes |
|---|---|
| `gemini-2.5-pro` | Best Gemini, long context |
| `gemini-2.5-flash` | Fast Gemini |
| `gemini-2.5-flash-lite` | Lightweight |
| `gemini-2.0-flash` / `gemini-2.0-flash-001` | Gemini 2.0 |

### Meta (Llama)

| Model | Notes |
|---|---|
| `llama-4-maverick-17b-128e` | Llama 4 Maverick |
| `llama-4-scout-17b-16e` | Llama 4 Scout |
| `llama-3.2-90b` | Llama 3.2 large |

### Mistral

| Model | Notes |
|---|---|
| `mistral-large-3` | Latest Mistral Large |
| `mistral-large-24.11` | Nov 2024 snapshot |
| `mistral-large-24.02` | Feb 2024 snapshot |

### DeepSeek

| Model | Notes |
|---|---|
| `deepseek-r1` | Strong reasoning model |

### Image Generation

| Model | Notes |
|---|---|
| `dall-e-3` | OpenAI image gen |
| `imagen-4-ultra` | Best Google image gen |
| `imagen-4` | Google image gen |
| `imagen-3` / `imagen-3-fast` | Imagen 3 |

### Embeddings

| Model | Notes |
|---|---|
| `text-embedding-3-large` | Best OpenAI embeddings |
| `text-embedding-3-small` | Smaller/cheaper |
| `text-embedding-ada-002` | Legacy OpenAI embeddings |
| `gemini-embedding-001` | Google embeddings |

### Audio

| Model | Notes |
|---|---|
| `whisper-1` | Speech-to-text |
| `tts-1` | Text-to-speech |
| `tts-1-hd` | High quality TTS |
| `gpt-4o-transcribe` | GPT-4o transcription |
| `gpt-4o-transcribe-diarize` | With speaker diarization |

---

## Recommended Models for BSA / Ops Work

| Use Case | Recommended Model |
|---|---|
| General reporting & summaries | `claude-sonnet-4-6` |
| Fast / high volume tasks | `claude-haiku-4-5` or `gemini-2.5-flash-lite` |
| Complex reasoning / analysis | `o3` or `deepseek-r1` |
| Long documents / large context | `gemini-2.5-pro` |
| Image generation | `imagen-4-ultra` or `dall-e-3` |
