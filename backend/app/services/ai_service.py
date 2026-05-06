"""
AI Service — Natural Language to SQL + Generative Insights + AI Dashboard Builder
Uses OpenAI (GPT-4o) or Anthropic (Claude) based on config.
"""
import json
import re
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

DASHBOARD_SYSTEM_PROMPT = """You are AnalyticsForge AI, an expert dashboard designer and BI consultant.
Your job is to generate structured dashboard configurations in valid JSON format.
You always return ONLY a single valid JSON object — no prose, no markdown fences, no explanation.
The JSON must be parseable by Python's json.loads().
"""


class AIService:

    def __init__(self):
        self.provider = "anthropic" if settings.ANTHROPIC_API_KEY else "openai"

    # ── Existing methods ─────────────────────────────────────────────────────

    async def natural_language_to_sql(self, question: str, schema: List[Dict], language: str = "en") -> str:
        schema_str = _format_schema(schema)
        prompt = f"""Database schema:\n{schema_str}\n\nUser question: {question}\n\nGenerate a SQL query. Return only the SQL."""
        return await self._call_llm(prompt)

    async def generate_insights(self, data_summary: str, question: Optional[str] = None, language: str = "en") -> str:
        lang_instruction = "Respond in Tamil (தமிழ்)." if language == "ta" else "Respond in English."
        prompt = f"""{lang_instruction}\n\nAnalyze this data:\n\n{data_summary}\n\n{f'Focus on: {question}' if question else ''}\n\nProvide:\n1. Key findings\n2. Trends\n3. Anomalies\n4. Recommendations"""
        return await self._call_llm(prompt)

    async def chat(self, messages: List[Dict[str, str]], language: str = "en") -> str:
        lang_instruction = "Respond in Tamil (தமிழ்)." if language == "ta" else ""
        system = SYSTEM_PROMPT + ("\n" + lang_instruction if lang_instruction else "")
        return await self._call_llm_chat(messages, system)

    # ── AI Dashboard Generation ───────────────────────────────────────────────

    async def generate_dashboard(self, requirements: str, language: str = "en") -> Dict:
        """
        Generate a full dashboard config from natural language requirements.
        Returns a dict with name, description, theme, and widgets array.
        """
        prompt = f"""You are a BI dashboard designer. Generate a professional analytics dashboard based on these requirements:

REQUIREMENTS:
{requirements}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{{
  "name": "Dashboard title",
  "description": "One sentence description",
  "theme": "light",
  "ai_summary": "2-3 sentence explanation of what this dashboard shows and why each widget was chosen",
  "widgets": [
    {{
      "title": "Widget title",
      "chart_type": "bar",
      "description": "What this widget shows and what insight it provides",
      "query": "SELECT example_column, COUNT(*) as count FROM example_table GROUP BY example_column",
      "config": {{"xAxis": "example_column", "yAxis": "count", "color": "#6366f1"}},
      "position_x": 0,
      "position_y": 0,
      "width": 6,
      "height": 4
    }}
  ]
}}

Rules:
- Generate 4 to 7 widgets covering different aspects of the requirements
- chart_type must be one of: bar, line, area, pie, donut, scatter, heatmap, kpi, table, funnel
- KPI widgets should have width=3, height=2
- Place KPI widgets in the first row (position_y=0)
- Place chart widgets below (position_y=2 or 4)
- Use a 12-column grid. No widget should have position_x + width > 12
- Queries should be realistic SQL for the domain described
- Each widget must have a meaningful description of the business insight it provides
- Return ONLY valid JSON, nothing else"""

        raw = await self._call_llm_with_system(prompt, DASHBOARD_SYSTEM_PROMPT)
        return _parse_json_response(raw)

    async def refine_dashboard(self, current_config: Dict, feedback: str, language: str = "en") -> Dict:
        """
        Refine an existing dashboard config based on user feedback.
        """
        current_json = json.dumps(current_config, indent=2)
        prompt = f"""You are a BI dashboard designer. Refine this existing dashboard based on user feedback.

CURRENT DASHBOARD CONFIG:
{current_json}

USER FEEDBACK / CHANGE REQUEST:
{feedback}

Apply the requested changes and return the COMPLETE updated dashboard config as a JSON object.
Keep all unchanged widgets exactly as they are.
Only modify, add, or remove what the user asked for.
Return ONLY the updated JSON object — no markdown, no explanation, just pure JSON."""

        raw = await self._call_llm_with_system(prompt, DASHBOARD_SYSTEM_PROMPT)
        return _parse_json_response(raw)

    # ── LLM Callers ──────────────────────────────────────────────────────────

    async def _call_llm(self, prompt: str) -> str:
        if self.provider == "anthropic":
            return await self._call_anthropic([{"role": "user", "content": prompt}])
        return await self._call_openai([{"role": "user", "content": prompt}])

    async def _call_llm_chat(self, messages: List[Dict], system: str) -> str:
        if self.provider == "anthropic":
            return await self._call_anthropic(messages, system)
        return await self._call_openai(messages, system)

    async def _call_llm_with_system(self, prompt: str, system: str) -> str:
        if self.provider == "anthropic":
            return await self._call_anthropic([{"role": "user", "content": prompt}], system)
        return await self._call_openai([{"role": "user", "content": prompt}], system)

    async def _call_openai(self, messages: List[Dict], system: str = SYSTEM_PROMPT) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": system}] + messages,
            temperature=0.3,
            max_tokens=4096,
        )
        return response.choices[0].message.content

    async def _call_anthropic(self, messages: List[Dict], system: str = SYSTEM_PROMPT) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            system=system,
            messages=messages,
        )
        return response.content[0].text


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_json_response(raw: str) -> Dict:
    """Extract and parse JSON from an LLM response, handling markdown fences."""
    text = raw.strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Could not parse JSON from AI response: {text[:200]}")


def _format_schema(schema: List[Dict]) -> str:
    lines = []
    for table in schema:
        cols = ", ".join(f"{c['name']} ({c['type']})" for c in table.get("columns", []))
        lines.append(f"Table: {table['table']} | Columns: {cols}")
    return "\n".join(lines) if lines else "No schema available."
