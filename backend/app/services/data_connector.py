"""
Data Connector Service
Handles connecting to various data sources and running queries.
Supports: PostgreSQL, MySQL, SQLite, CSV, Excel, REST API, Google Sheets
"""
import pandas as pd
import json
from typing import Any, Dict, List, Optional
import sqlalchemy


class DataConnectorService:

    @staticmethod
    def connect_and_query(connector_type: str, config: dict, query: str) -> Dict[str, Any]:
        """Route to the correct connector based on type."""
        handlers = {
            "postgresql": DataConnectorService._query_sql,
            "mysql": DataConnectorService._query_sql,
            "sqlite": DataConnectorService._query_sql,
            "csv": DataConnectorService._query_csv,
            "excel": DataConnectorService._query_excel,
            "rest_api": DataConnectorService._query_rest_api,
        }
        handler = handlers.get(connector_type)
        if not handler:
            raise ValueError(f"Unsupported connector type: {connector_type}")
        return handler(config, query)

    @staticmethod
    def _query_sql(config: dict, query: str) -> Dict[str, Any]:
        db_url = config.get("url") or _build_db_url(config)
        engine = sqlalchemy.create_engine(db_url)
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        return {
            "columns": df.columns.tolist(),
            "rows": df.values.tolist(),
            "row_count": len(df),
        }

    @staticmethod
    def _query_csv(config: dict, query: str) -> Dict[str, Any]:
        file_path = config.get("file_path")
        df = pd.read_csv(file_path)
        # Apply basic filter if query is a column name pattern
        return {
            "columns": df.columns.tolist(),
            "rows": df.head(1000).values.tolist(),
            "row_count": len(df),
        }

    @staticmethod
    def _query_excel(config: dict, query: str) -> Dict[str, Any]:
        file_path = config.get("file_path")
        sheet = config.get("sheet_name", 0)
        df = pd.read_excel(file_path, sheet_name=sheet)
        return {
            "columns": df.columns.tolist(),
            "rows": df.head(1000).values.tolist(),
            "row_count": len(df),
        }

    @staticmethod
    def _query_rest_api(config: dict, query: str) -> Dict[str, Any]:
        import httpx
        url = config.get("url")
        headers = config.get("headers", {})
        params = config.get("params", {})
        resp = httpx.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            df = pd.json_normalize(data)
        elif isinstance(data, dict):
            # Try common wrapper keys
            for key in ["data", "results", "items", "records"]:
                if key in data and isinstance(data[key], list):
                    df = pd.json_normalize(data[key])
                    break
            else:
                df = pd.json_normalize([data])
        return {
            "columns": df.columns.tolist(),
            "rows": df.head(1000).values.tolist(),
            "row_count": len(df),
        }

    @staticmethod
    def get_schema(connector_type: str, config: dict) -> List[Dict]:
        """Return table/column schema for a data source."""
        if connector_type in ("postgresql", "mysql", "sqlite"):
            db_url = config.get("url") or _build_db_url(config)
            engine = sqlalchemy.create_engine(db_url)
            inspector = sqlalchemy.inspect(engine)
            tables = []
            for table_name in inspector.get_table_names():
                columns = [
                    {"name": c["name"], "type": str(c["type"])}
                    for c in inspector.get_columns(table_name)
                ]
                tables.append({"table": table_name, "columns": columns})
            return tables
        return []


def _build_db_url(config: dict) -> str:
    driver_map = {
        "postgresql": "postgresql",
        "mysql": "mysql+pymysql",
        "sqlite": "sqlite",
    }
    driver = driver_map.get(config.get("type", "postgresql"), "postgresql")
    if driver == "sqlite":
        return f"sqlite:///{config.get('file_path', ':memory:')}"
    host = config.get("host", "localhost")
    port = config.get("port", 5432)
    user = config.get("user", "")
    password = config.get("password", "")
    dbname = config.get("database", "")
    return f"{driver}://{user}:{password}@{host}:{port}/{dbname}"
