"""
AutoML Service — one-click machine learning on any dataset.
Supports: Classification, Regression, Clustering, Anomaly Detection
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional


class AutoMLService:

    @staticmethod
    def detect_task(df: pd.DataFrame, target_col: str) -> str:
        """Auto-detect whether this is classification or regression."""
        series = df[target_col].dropna()
        n_unique = series.nunique()
        if n_unique <= 10 or series.dtype == object:
            return "classification"
        return "regression"

    @staticmethod
    def run(
        data: Dict[str, Any],
        target_column: str,
        task: Optional[str] = None,
        feature_columns: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        from sklearn.model_selection import train_test_split
        from sklearn.preprocessing import LabelEncoder, StandardScaler
        from sklearn.pipeline import Pipeline
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
        from sklearn.linear_model import LogisticRegression, LinearRegression
        from sklearn.metrics import (
            accuracy_score, f1_score, mean_squared_error,
            r2_score, classification_report
        )
        import warnings
        warnings.filterwarnings("ignore")

        df = pd.DataFrame(data["rows"], columns=data["columns"])

        # Feature selection
        feature_cols = feature_columns or [c for c in df.columns if c != target_column]
        df = df[feature_cols + [target_column]].dropna()

        if len(df) < 20:
            raise ValueError("Not enough data. Need at least 20 rows.")

        # Auto-detect task
        if not task:
            task = AutoMLService.detect_task(df, target_column)

        # Encode categoricals
        le_map = {}
        for col in df.columns:
            if df[col].dtype == object:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                le_map[col] = list(le.classes_)

        X = df[feature_cols].values
        y = df[target_column].values

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Train multiple models and pick best
        if task == "classification":
            candidates = {
                "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
                "Gradient Boosting": GradientBoostingClassifier(random_state=42),
                "Logistic Regression": LogisticRegression(max_iter=500, random_state=42),
            }
            best_name, best_model, best_score = None, None, -1
            results = {}
            for name, model in candidates.items():
                scaler = StandardScaler()
                X_train_s = scaler.fit_transform(X_train)
                X_test_s = scaler.transform(X_test)
                model.fit(X_train_s, y_train)
                preds = model.predict(X_test_s)
                score = f1_score(y_test, preds, average="weighted", zero_division=0)
                acc = accuracy_score(y_test, preds)
                results[name] = {"f1": round(score, 4), "accuracy": round(acc, 4)}
                if score > best_score:
                    best_score, best_name, best_model = score, name, model

            scaler = StandardScaler()
            X_train_s = scaler.fit_transform(X_train)
            X_test_s = scaler.transform(X_test)
            best_model.fit(X_train_s, y_train)
            preds = best_model.predict(X_test_s)

            feature_importance = {}
            if hasattr(best_model, "feature_importances_"):
                feature_importance = dict(zip(feature_cols, [round(float(v), 4) for v in best_model.feature_importances_]))

            return {
                "task": "classification",
                "best_model": best_name,
                "metrics": results[best_name],
                "all_models": results,
                "feature_importance": feature_importance,
                "target_classes": le_map.get(target_column, []),
                "sample_predictions": [{"actual": int(a), "predicted": int(p)} for a, p in zip(y_test[:10], preds[:10])],
                "row_count": len(df),
                "feature_columns": feature_cols,
            }

        else:  # regression
            candidates = {
                "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
                "Gradient Boosting": GradientBoostingRegressor(random_state=42),
                "Linear Regression": LinearRegression(),
            }
            best_name, best_model, best_score = None, None, -1e9
            results = {}
            for name, model in candidates.items():
                scaler = StandardScaler()
                X_train_s = scaler.fit_transform(X_train)
                X_test_s = scaler.transform(X_test)
                model.fit(X_train_s, y_train)
                preds = model.predict(X_test_s)
                r2 = r2_score(y_test, preds)
                rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
                results[name] = {"r2": round(r2, 4), "rmse": round(rmse, 4)}
                if r2 > best_score:
                    best_score, best_name, best_model = r2, name, model

            scaler = StandardScaler()
            X_train_s = scaler.fit_transform(X_train)
            X_test_s = scaler.transform(X_test)
            best_model.fit(X_train_s, y_train)
            preds = best_model.predict(X_test_s)

            feature_importance = {}
            if hasattr(best_model, "feature_importances_"):
                feature_importance = dict(zip(feature_cols, [round(float(v), 4) for v in best_model.feature_importances_]))

            return {
                "task": "regression",
                "best_model": best_name,
                "metrics": results[best_name],
                "all_models": results,
                "feature_importance": feature_importance,
                "sample_predictions": [{"actual": round(float(a), 2), "predicted": round(float(p), 2)} for a, p in zip(y_test[:10], preds[:10])],
                "row_count": len(df),
                "feature_columns": feature_cols,
            }

    @staticmethod
    def cluster(data: Dict[str, Any], n_clusters: int = 3, feature_columns: Optional[List[str]] = None) -> Dict[str, Any]:
        """KMeans clustering."""
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler

        df = pd.DataFrame(data["rows"], columns=data["columns"])
        feature_cols = feature_columns or [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        df_num = df[feature_cols].dropna()

        scaler = StandardScaler()
        X = scaler.fit_transform(df_num.values)

        kmeans = KMeans(n_clusters=min(n_clusters, len(df_num) - 1), random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)

        df_num = df_num.copy()
        df_num["cluster"] = labels

        cluster_summary = df_num.groupby("cluster")[feature_cols].mean().round(3).to_dict(orient="index")

        return {
            "clusters": int(n_clusters),
            "feature_columns": feature_cols,
            "cluster_sizes": df_num["cluster"].value_counts().to_dict(),
            "cluster_centers": cluster_summary,
            "assignments": labels.tolist(),
        }
