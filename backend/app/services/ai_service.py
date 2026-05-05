"""
AI Service — Natural Language to SQL + Generative Insights
Uses OpenAI (GPT-4o) or Anthropic (Claude) based on config.
"""
from typing import Optional, List, Dict, Any
from ..config import settings


SYSTEM_PROMPT = """You are AnalyticsForge AI, an expert business intelligence assistant.
You help users query their data using natural language, generate SQL queries,
provide data insights, detect anomalies, and explain trends clearly.

When generating SQL:
- Return ONLY valid SQL, no explanations unless asked.
- Use standard SQL syntax compatible with PostgreSQL.
- Always use column aliases for readability.
- Limit results to 1000 rows unless the user specifies otherwise.

When providing insights:
- Be concise and business-focused.
- Highlight key trends, anomalies, and actionable recommendations.
- Support both English and Tamil (தமிழ்) based on user preference.
"""


class AIService:

    def __init__(self):
        self.provider = "anthropic" if settings.ANTHROPIC_API_KEY else "openai"

    async def natural_language_to_sql(
        self,
        question: str,
        schema: List[Dict],
        language: str = "en"
    ) -> str:
        """Convert a natural language question to SQL given the schema."""
        schema_str = _format_schema(schema)
        prompt = f"""Database schema:
{schema_str}

User question: {question}

Generate a SQL query to answer this question. Return only the SQL."""

        return await self._call_llm(prompt)

    async def generate_insights(
        self,
        data_summary: str,
        question: Optional[str] = None,
        language: str = "en"
    ) -> str:
        """Generate AI insights from a data summary."""
        lang_instruction = "Respond in Tamil (தமிழ்)." if language == "ta" else "Respond in English."
        prompt = f"""{lang_instruction}

Analyze the following data and provide clear business insights, trends, and recommendations:

{data_summary}

{f'Focus on: {question}' if question else ''}

Provide a structured analysis with:
1. Key findings
2. Trends observed
3. Anomalies (if any)
4. Actionable recommendations"""

        return await self._call_llm(prompt)

    async def chat(self, messages: List[Dict[str, str]], language: str = "en") -> str:
        """General conversational AI for the Ask Bot feature."""
        lang_instruction = "Respond in Tamil (தமிழ்)." if language == "ta" else ""
        system = SYSTEM_PROMPT + ("\n" + lang_instruction if lang_instruction else "")
        return await self._call_llm_chat(messages, system)

    async def _call_llm(self, prompt: str) -> str:
        if self.provider == "anthropic":
            return await self._call_anthropic([{"role": "user", "content": prompt}])
        return await self._call_openai([{"role": "user", "content": prompt}])

    async def _call_llm_chat(self, messages: List[Dict], system: str) -> str:
        if self.provider == "anthropic":
            return await self._call_anthropic(messages, system)
        return await self._call_openai(messages, system)

    async def _call_openai(self, messages: List[Dict], system: str = SYSTEM_PROMPT) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        full_messages = [{"role": "system", "content": system}] + messages
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=full_messages,
            temperature=0.2,
            max_tokens=2048,
        )
        return response.choices[0].message.content

    async def _call_anthropic(self, messages: List[Dict], system: str = SYSTEM_PROMPT) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            system=system,
            messages=messages,
        )
        return response.content[0].text


def _format_schema(schema: List[Dict]) -> str:
    lines = []
    for table in schema:
        cols = ", ".join(f"{c['name']} ({c['type']})" for c in table.get("columns", []))
        lines.append(f"Table: {table['table']} | Columns: {cols}")
    return "\n".join(lines) if lines else "No schema available."
