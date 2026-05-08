"""
Data Connector Service
Handles connecting to various data sources and running queries.

Supported connectors:
  SQL    : postgresql, mysql, sqlite
  Files  : csv, excel
  HTTP   : rest_api
  ITSM   : jira, servicenow, servicedesk_plus
"""
import pandas as pd
import json
import base64
from typing import Any, Dict, List, Optional
import sqlalchemy


# ── Connector registry ─────────────────────────────────────────────────────────

class DataConnectorService:

    @staticmethod
    def connect_and_query(connector_type: str, config: dict, query: str) -> Dict[str, Any]:
        """Route to the correct connector based on type."""
        handlers = {
            "postgresql":      DataConnectorService._query_sql,
            "mysql":           DataConnectorService._query_sql,
            "sqlite":          DataConnectorService._query_sql,
            "csv":             DataConnectorService._query_csv,
            "excel":           DataConnectorService._query_excel,
            "rest_api":        DataConnectorService._query_rest_api,
            "jira":            JiraConnector.query,
            "servicenow":      ServiceNowConnector.query,
            "servicedesk_plus": ServiceDeskPlusConnector.query,
        }
        handler = handlers.get(connector_type)
        if not handler:
            raise ValueError(f"Unsupported connector type: {connector_type}")
        return handler(config, query)

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

        if connector_type == "jira":
            return JiraConnector.get_schema(config)

        if connector_type == "servicenow":
            return ServiceNowConnector.get_schema(config)

        if connector_type == "servicedesk_plus":
            return ServiceDeskPlusConnector.get_schema(config)

        return []

    # ── SQL ───────────────────────────────────────────────────────────────────
    @staticmethod
    def _query_sql(config: dict, query: str) -> Dict[str, Any]:
        db_url = config.get("url") or _build_db_url(config)
        engine = sqlalchemy.create_engine(db_url)
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        return {"columns": df.columns.tolist(), "rows": df.values.tolist(), "row_count": len(df)}

    # ── CSV ───────────────────────────────────────────────────────────────────
    @staticmethod
    def _query_csv(config: dict, query: str) -> Dict[str, Any]:
        df = pd.read_csv(config.get("file_path"))
        return {"columns": df.columns.tolist(), "rows": df.head(1000).values.tolist(), "row_count": len(df)}

    # ── Excel ─────────────────────────────────────────────────────────────────
    @staticmethod
    def _query_excel(config: dict, query: str) -> Dict[str, Any]:
        df = pd.read_excel(config.get("file_path"), sheet_name=config.get("sheet_name", 0))
        return {"columns": df.columns.tolist(), "rows": df.head(1000).values.tolist(), "row_count": len(df)}

    # ── REST API ──────────────────────────────────────────────────────────────
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
            for key in ["data", "results", "items", "records"]:
                if key in data and isinstance(data[key], list):
                    df = pd.json_normalize(data[key])
                    break
            else:
                df = pd.json_normalize([data])
        return {"columns": df.columns.tolist(), "rows": df.head(1000).values.tolist(), "row_count": len(df)}


# ── JIRA Connector ─────────────────────────────────────────────────────────────
#
# config keys:
#   base_url   : "https://jira.company.com" or "http://ip:port/context"
#   username   : JIRA username / email
#   api_token  : API token (Cloud) or password (Server/DC)
#   auth_type  : "basic" (default) | "pat"  (Personal Access Token — Server/DC only)
#
# Query syntax:
#   "issues:<JQL>"                 → search issues via JQL
#   "projects"                     → list all projects
#   "boards"                       → list all boards
#   "sprints:<boardId>"            → list sprints for a board
#   "users"                        → list users
#   "components:<projectKey>"      → list components for a project
#   "worklogs:<issueKey>"          → worklogs for a specific issue
#   "<JQL>"                        → shorthand for issues (no prefix needed)
#
class JiraConnector:

    @staticmethod
    def _session(config: dict):
        import httpx
        base = config["base_url"].rstrip("/")
        auth_type = config.get("auth_type", "basic")
        username = config.get("username", "")
        token = config.get("api_token", "")

        if auth_type == "pat":
            # Personal Access Token — Bearer header (Jira Server/DC 8.14+)
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            return httpx.Client(base_url=base, headers=headers, timeout=30, verify=False)
        else:
            # Basic auth: username:api_token encoded as base64
            creds = base64.b64encode(f"{username}:{token}".encode()).decode()
            headers = {"Authorization": f"Basic {creds}", "Content-Type": "application/json"}
            return httpx.Client(base_url=base, headers=headers, timeout=30, verify=False)

    @staticmethod
    def query(config: dict, query: str) -> Dict[str, Any]:
        query = query.strip()
        client = JiraConnector._session(config)

        with client:
            # Route by prefix
            if query.lower().startswith("projects"):
                return JiraConnector._list_projects(client)
            elif query.lower().startswith("boards"):
                return JiraConnector._list_boards(client)
            elif query.lower().startswith("sprints:"):
                board_id = query.split(":", 1)[1].strip()
                return JiraConnector._list_sprints(client, board_id)
            elif query.lower().startswith("users"):
                return JiraConnector._list_users(client)
            elif query.lower().startswith("components:"):
                project_key = query.split(":", 1)[1].strip()
                return JiraConnector._list_components(client, project_key)
            elif query.lower().startswith("worklogs:"):
                issue_key = query.split(":", 1)[1].strip()
                return JiraConnector._get_worklogs(client, issue_key)
            elif query.lower().startswith("issues:"):
                jql = query.split(":", 1)[1].strip()
                return JiraConnector._search_issues(client, jql)
            else:
                # Treat bare query as JQL
                return JiraConnector._search_issues(client, query)

    @staticmethod
    def _search_issues(client, jql: str) -> Dict[str, Any]:
        FIELDS = [
            "summary", "status", "priority", "assignee", "reporter",
            "created", "updated", "resolutiondate", "issuetype",
            "project", "labels", "components", "fixVersions",
            "story_points", "customfield_10016", "duedate", "description"
        ]
        params = {
            "jql": jql,
            "maxResults": 1000,
            "fields": ",".join(FIELDS),
        }
        resp = client.get("/rest/api/2/search", params=params)
        resp.raise_for_status()
        data = resp.json()
        issues = data.get("issues", [])

        rows = []
        for i in issues:
            f = i.get("fields", {})
            rows.append({
                "key":            i.get("key"),
                "summary":        f.get("summary"),
                "status":         f.get("status", {}).get("name") if f.get("status") else None,
                "priority":       f.get("priority", {}).get("name") if f.get("priority") else None,
                "issue_type":     f.get("issuetype", {}).get("name") if f.get("issuetype") else None,
                "project":        f.get("project", {}).get("key") if f.get("project") else None,
                "project_name":   f.get("project", {}).get("name") if f.get("project") else None,
                "assignee":       f.get("assignee", {}).get("displayName") if f.get("assignee") else None,
                "reporter":       f.get("reporter", {}).get("displayName") if f.get("reporter") else None,
                "created":        f.get("created"),
                "updated":        f.get("updated"),
                "due_date":       f.get("duedate"),
                "resolution_date":f.get("resolutiondate"),
                "labels":         ", ".join(f.get("labels", [])),
                "story_points":   f.get("customfield_10016"),
                "components":     ", ".join(c["name"] for c in f.get("components", [])),
                "fix_versions":   ", ".join(v["name"] for v in f.get("fixVersions", [])),
            })

        return _to_result(rows)

    @staticmethod
    def _list_projects(client) -> Dict[str, Any]:
        resp = client.get("/rest/api/2/project")
        resp.raise_for_status()
        rows = [
            {
                "key":         p.get("key"),
                "name":        p.get("name"),
                "project_type":p.get("projectTypeKey"),
                "lead":        p.get("lead", {}).get("displayName") if p.get("lead") else None,
                "id":          p.get("id"),
            }
            for p in resp.json()
        ]
        return _to_result(rows)

    @staticmethod
    def _list_boards(client) -> Dict[str, Any]:
        resp = client.get("/rest/agile/1.0/board", params={"maxResults": 200})
        resp.raise_for_status()
        boards = resp.json().get("values", [])
        rows = [
            {
                "id":           b.get("id"),
                "name":         b.get("name"),
                "type":         b.get("type"),
                "project_key":  b.get("location", {}).get("projectKey") if b.get("location") else None,
                "project_name": b.get("location", {}).get("projectName") if b.get("location") else None,
            }
            for b in boards
        ]
        return _to_result(rows)

    @staticmethod
    def _list_sprints(client, board_id: str) -> Dict[str, Any]:
        resp = client.get(f"/rest/agile/1.0/board/{board_id}/sprint", params={"maxResults": 200})
        resp.raise_for_status()
        sprints = resp.json().get("values", [])
        rows = [
            {
                "id":         s.get("id"),
                "name":       s.get("name"),
                "state":      s.get("state"),
                "start_date": s.get("startDate"),
                "end_date":   s.get("endDate"),
                "complete_date": s.get("completeDate"),
                "goal":       s.get("goal"),
            }
            for s in sprints
        ]
        return _to_result(rows)

    @staticmethod
    def _list_users(client) -> Dict[str, Any]:
        # Cloud: /rest/api/3/users/search  |  Server: /rest/api/2/user/search?username=.
        try:
            resp = client.get("/rest/api/2/user/search", params={"username": ".", "maxResults": 1000})
            resp.raise_for_status()
            users = resp.json()
        except Exception:
            resp = client.get("/rest/api/3/users/search", params={"maxResults": 1000})
            resp.raise_for_status()
            users = resp.json()

        rows = [
            {
                "account_id":    u.get("accountId") or u.get("key"),
                "display_name":  u.get("displayName"),
                "email":         u.get("emailAddress"),
                "active":        u.get("active"),
                "account_type":  u.get("accountType"),
            }
            for u in users
        ]
        return _to_result(rows)

    @staticmethod
    def _list_components(client, project_key: str) -> Dict[str, Any]:
        resp = client.get(f"/rest/api/2/project/{project_key}/components")
        resp.raise_for_status()
        rows = [
            {
                "id":          c.get("id"),
                "name":        c.get("name"),
                "description": c.get("description"),
                "lead":        c.get("lead", {}).get("displayName") if c.get("lead") else None,
            }
            for c in resp.json()
        ]
        return _to_result(rows)

    @staticmethod
    def _get_worklogs(client, issue_key: str) -> Dict[str, Any]:
        resp = client.get(f"/rest/api/2/issue/{issue_key}/worklog")
        resp.raise_for_status()
        logs = resp.json().get("worklogs", [])
        rows = [
            {
                "issue_key":        issue_key,
                "author":           w.get("author", {}).get("displayName") if w.get("author") else None,
                "time_spent":       w.get("timeSpent"),
                "time_spent_seconds": w.get("timeSpentSeconds"),
                "started":          w.get("started"),
                "created":          w.get("created"),
                "updated":          w.get("updated"),
                "comment":          w.get("comment"),
            }
            for w in logs
        ]
        return _to_result(rows)

    @staticmethod
    def get_schema(config: dict) -> List[Dict]:
        return [
            {"table": "issues",     "columns": [
                {"name": "key", "type": "VARCHAR"},
                {"name": "summary", "type": "VARCHAR"},
                {"name": "status", "type": "VARCHAR"},
                {"name": "priority", "type": "VARCHAR"},
                {"name": "issue_type", "type": "VARCHAR"},
                {"name": "project", "type": "VARCHAR"},
                {"name": "project_name", "type": "VARCHAR"},
                {"name": "assignee", "type": "VARCHAR"},
                {"name": "reporter", "type": "VARCHAR"},
                {"name": "created", "type": "TIMESTAMP"},
                {"name": "updated", "type": "TIMESTAMP"},
                {"name": "due_date", "type": "DATE"},
                {"name": "resolution_date", "type": "TIMESTAMP"},
                {"name": "labels", "type": "VARCHAR"},
                {"name": "story_points", "type": "NUMERIC"},
                {"name": "components", "type": "VARCHAR"},
                {"name": "fix_versions", "type": "VARCHAR"},
            ]},
            {"table": "projects",   "columns": [
                {"name": "key", "type": "VARCHAR"},
                {"name": "name", "type": "VARCHAR"},
                {"name": "project_type", "type": "VARCHAR"},
                {"name": "lead", "type": "VARCHAR"},
                {"name": "id", "type": "VARCHAR"},
            ]},
            {"table": "boards",     "columns": [
                {"name": "id", "type": "INTEGER"},
                {"name": "name", "type": "VARCHAR"},
                {"name": "type", "type": "VARCHAR"},
                {"name": "project_key", "type": "VARCHAR"},
                {"name": "project_name", "type": "VARCHAR"},
            ]},
            {"table": "sprints",    "columns": [
                {"name": "id", "type": "INTEGER"},
                {"name": "name", "type": "VARCHAR"},
                {"name": "state", "type": "VARCHAR"},
                {"name": "start_date", "type": "TIMESTAMP"},
                {"name": "end_date", "type": "TIMESTAMP"},
                {"name": "complete_date", "type": "TIMESTAMP"},
                {"name": "goal", "type": "VARCHAR"},
            ]},
            {"table": "users",      "columns": [
                {"name": "account_id", "type": "VARCHAR"},
                {"name": "display_name", "type": "VARCHAR"},
                {"name": "email", "type": "VARCHAR"},
                {"name": "active", "type": "BOOLEAN"},
                {"name": "account_type", "type": "VARCHAR"},
            ]},
            {"table": "components", "columns": [
                {"name": "id", "type": "VARCHAR"},
                {"name": "name", "type": "VARCHAR"},
                {"name": "description", "type": "VARCHAR"},
                {"name": "lead", "type": "VARCHAR"},
            ]},
            {"table": "worklogs",   "columns": [
                {"name": "issue_key", "type": "VARCHAR"},
                {"name": "author", "type": "VARCHAR"},
                {"name": "time_spent", "type": "VARCHAR"},
                {"name": "time_spent_seconds", "type": "INTEGER"},
                {"name": "started", "type": "TIMESTAMP"},
                {"name": "created", "type": "TIMESTAMP"},
                {"name": "comment", "type": "VARCHAR"},
            ]},
        ]


# ── ServiceNow Connector ───────────────────────────────────────────────────────
#
# config keys:
#   instance   : "company" (just the subdomain) or full URL "https://company.service-now.com"
#   username   : ServiceNow username
#   password   : ServiceNow password
#
# Query syntax:
#   "<table>"                          → fetch all records from the table (up to 1000)
#   "<table>:<sysparm_query>"          → fetch records matching a ServiceNow encoded query
#   Examples:
#     "incident"
#     "incident:active=true^priority=1"
#     "change_request:state=implement"
#     "sys_user:active=true"
#
SERVICENOW_TABLES = {
    "incident":       ["number", "short_description", "state", "priority", "category",
                       "subcategory", "assigned_to", "caller_id", "opened_at", "resolved_at",
                       "closed_at", "sys_updated_on", "impact", "urgency", "severity",
                       "close_code", "close_notes", "cmdb_ci", "location", "business_service"],
    "problem":        ["number", "short_description", "state", "priority", "assigned_to",
                       "opened_at", "resolved_at", "known_error", "workaround", "cause_notes"],
    "change_request": ["number", "short_description", "state", "type", "priority", "risk",
                       "assigned_to", "start_date", "end_date", "opened_at", "closed_at",
                       "category", "cmdb_ci", "justification", "implementation_plan"],
    "sys_user":       ["user_name", "name", "email", "department", "title", "active",
                       "phone", "location", "manager", "roles", "last_login"],
    "cmdb_ci":        ["name", "class_name", "operational_status", "install_status",
                       "assigned_to", "location", "ip_address", "os", "manufacturer", "model_id"],
    "task":           ["number", "short_description", "state", "priority", "assigned_to",
                       "opened_at", "due_date", "closed_at", "work_notes"],
    "sc_req_item":    ["number", "short_description", "state", "stage", "requested_for",
                       "quantity", "cat_item", "opened_at", "due_date", "price"],
    "sc_request":     ["number", "short_description", "state", "requested_for",
                       "opened_at", "due_date", "price", "approval"],
    "kb_knowledge":   ["number", "short_description", "workflow_state", "author",
                       "category", "sys_updated_on", "valid_to"],
    "sn_si_incident": ["number", "short_description", "state", "priority", "affected_cis",
                       "opened_at", "resolved_at"],
}

class ServiceNowConnector:

    @staticmethod
    def _base_url(config: dict) -> str:
        instance = config.get("instance", "")
        if instance.startswith("http"):
            return instance.rstrip("/")
        return f"https://{instance}.service-now.com"

    @staticmethod
    def _session(config: dict):
        import httpx
        base = ServiceNowConnector._base_url(config)
        auth = (config.get("username", ""), config.get("password", ""))
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        return httpx.Client(base_url=base, auth=auth, headers=headers, timeout=30, verify=False)

    @staticmethod
    def query(config: dict, query: str) -> Dict[str, Any]:
        query = query.strip()

        # Parse "table:sysparm_query" format
        if ":" in query:
            table, sysparm_query = query.split(":", 1)
            table = table.strip()
            sysparm_query = sysparm_query.strip()
        else:
            table = query
            sysparm_query = ""

        # Determine fields to return
        known_fields = SERVICENOW_TABLES.get(table)
        fields_param = ",".join(known_fields) if known_fields else ""

        params: Dict[str, Any] = {"sysparm_limit": 1000, "sysparm_display_value": "true"}
        if sysparm_query:
            params["sysparm_query"] = sysparm_query
        if fields_param:
            params["sysparm_fields"] = fields_param

        with ServiceNowConnector._session(config) as client:
            resp = client.get(f"/api/now/table/{table}", params=params)
            resp.raise_for_status()

        records = resp.json().get("result", [])
        if not records:
            return {"columns": [], "rows": [], "row_count": 0}

        # Flatten display values (ServiceNow returns {"value": ..., "display_value": ...} objects)
        flat_records = []
        for rec in records:
            flat = {}
            for k, v in rec.items():
                if isinstance(v, dict):
                    flat[k] = v.get("display_value") or v.get("value")
                else:
                    flat[k] = v
            flat_records.append(flat)

        return _to_result(flat_records)

    @staticmethod
    def get_schema(config: dict) -> List[Dict]:
        return [
            {
                "table": table,
                "columns": [{"name": col, "type": "VARCHAR"} for col in cols]
            }
            for table, cols in SERVICENOW_TABLES.items()
        ]


# ── ServiceDesk Plus Connector ─────────────────────────────────────────────────
#
# config keys:
#   base_url   : "https://sdp.company.com" or "http://ip:port"
#   api_key    : Technician API key
#   version    : "v3" (default) — API version
#
# Query syntax:
#   "<module>"                         → list records (default limit 100)
#   "<module>:<filter_json>"           → list records with filter
#   Examples:
#     "requests"
#     "requests:{"list_info":{"filter_by":[{"field":"status.name","condition":"is","value":"Open"}]}}"
#     "problems"
#     "changes"
#     "assets"
#     "projects"
#
SDP_MODULES = {
    "requests": ["id", "subject", "status", "priority", "urgency", "impact",
                 "category", "subcategory", "item", "requester", "technician",
                 "created_time", "due_by_time", "resolved_time", "closed_time",
                 "is_overdue", "group", "site", "has_attachments", "description"],
    "problems": ["id", "title", "status", "priority", "urgency", "impact",
                 "category", "owner", "created_time", "due_date", "closed_time",
                 "is_known_error", "workaround", "root_cause"],
    "changes":  ["id", "title", "status", "type", "priority", "risk",
                 "category", "owner", "scheduled_start_time", "scheduled_end_time",
                 "created_time", "closed_time", "reason_for_change"],
    "assets":   ["id", "name", "asset_type", "product", "vendor", "status",
                 "asset_tag", "serial_number", "location", "assigned_user",
                 "acquisition_date", "expiry_date", "cost"],
    "projects": ["id", "title", "status", "owner", "start_date", "end_date",
                 "percent_completed", "description"],
    "workorders": ["id", "title", "status", "priority", "technician", "created_time",
                   "scheduled_start_time", "scheduled_end_time", "actual_start_time",
                   "actual_end_time", "description"],
}

class ServiceDeskPlusConnector:

    @staticmethod
    def _session(config: dict):
        import httpx
        base = config.get("base_url", "").rstrip("/")
        api_key = config.get("api_key", "")
        headers = {
            "Accept": "application/vnd.manageengine.sdp.v3+json",
            "technician_key": api_key,
        }
        return httpx.Client(base_url=base, headers=headers, timeout=30, verify=False)

    @staticmethod
    def query(config: dict, query: str) -> Dict[str, Any]:
        query = query.strip()
        version = config.get("version", "v3")

        # Parse "module:filter_json" or just "module"
        if ":" in query and query.index(":") < 30:
            module, rest = query.split(":", 1)
            module = module.strip()
            try:
                input_data = json.loads(rest.strip())
            except Exception:
                input_data = {"list_info": {"row_count": 100, "start_index": 1}}
        else:
            module = query.strip()
            input_data = {"list_info": {"row_count": 100, "start_index": 1}}

        if "list_info" not in input_data:
            input_data["list_info"] = {"row_count": 100, "start_index": 1}

        with ServiceDeskPlusConnector._session(config) as client:
            resp = client.get(
                f"/api/{version}/{module}",
                params={"input_data": json.dumps(input_data)},
            )
            resp.raise_for_status()

        data = resp.json()

        # SDP wraps responses differently per module
        records = None
        for key in [module, "requests", "problems", "changes", "assets",
                    "projects", "workorders", "data", "results"]:
            if key in data and isinstance(data[key], list):
                records = data[key]
                break

        if not records:
            return {"columns": [], "rows": [], "row_count": 0}

        flat_records = [_flatten_sdp_record(r) for r in records]
        return _to_result(flat_records)

    @staticmethod
    def get_schema(config: dict) -> List[Dict]:
        return [
            {
                "table": module,
                "columns": [{"name": col, "type": "VARCHAR"} for col in cols]
            }
            for module, cols in SDP_MODULES.items()
        ]


# ── Shared helpers ─────────────────────────────────────────────────────────────

def _to_result(rows: list) -> Dict[str, Any]:
    """Convert a list of dicts to columns/rows/row_count format."""
    if not rows:
        return {"columns": [], "rows": [], "row_count": 0}
    df = pd.json_normalize(rows)
    return {
        "columns": df.columns.tolist(),
        "rows": df.where(pd.notnull(df), None).values.tolist(),
        "row_count": len(df),
    }


def _flatten_sdp_record(record: dict, prefix: str = "") -> dict:
    """Recursively flatten nested SDP record dicts to dot-notation keys."""
    flat = {}
    for k, v in record.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            flat.update(_flatten_sdp_record(v, full_key))
        else:
            flat[full_key] = v
    return flat


def _build_db_url(config: dict) -> str:
    driver_map = {
        "postgresql": "postgresql",
        "mysql":      "mysql+pymysql",
        "sqlite":     "sqlite",
    }
    driver = driver_map.get(config.get("type", "postgresql"), "postgresql")
    if driver == "sqlite":
        return f"sqlite:///{config.get('file_path', ':memory:')}"
    host     = config.get("host", "localhost")
    port     = config.get("port", 5432)
    user     = config.get("user", "")
    password = config.get("password", "")
    dbname   = config.get("database", "")
    return f"{driver}://{user}:{password}@{host}:{port}/{dbname}"
