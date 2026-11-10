"""Main FastAPI application for PrepMap API.

Serves ML-powered interview and placement preparation tools:
- Practice sets tailored to individual company hiring processes
- Real-time subject and difficulty question classifier
- Company recommendation engine based on public hiring criteria
"""

import os
import random
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from loader import AppState, load_artifacts
from schemas import (
    AnalyseRequest,
    AnalyseResponse,
    CompanyDetailResponse,
    CompanyProfile,
    CompanyRelevance,
    HealthResponse,
    PracticeQuestion,
    PracticeResponse,
    QuestionDetailResponse,
    RootResponse,
    SubjectCandidate,
)

DISCLAIMER_TEXT = (
    "Recommended based on each company's public hiring process, not a record of questions the company asked."
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load machine learning models and datasets once at startup and clean up on shutdown."""
    app.state.artifacts = load_artifacts()
    yield
    # Cleanup if needed
    app.state.artifacts = None


app = FastAPI(
    title="PrepMap API",
    description=(
        "Placement and interview prep backend serving machine learning classifiers "
        "and company hiring process mappings loaded from Hugging Face."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "*").strip()
if allowed_origins_env == "*" or not allowed_origins_env:
    allow_origins = ["*"]
else:
    allow_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False if allow_origins == ["*"] else True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_state() -> AppState:
    """Helper to retrieve initialized app state."""
    artifacts = getattr(app.state, "artifacts", None)
    if artifacts is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Models and dataset artifacts are still initializing. Please retry shortly."
        )
    return artifacts


@app.get(
    "/",
    response_model=RootResponse,
    tags=["General"],
    summary="Root endpoint"
)
def get_root():
    """Return API metadata and documentation link."""
    return {"name": "PrepMap API", "docs": "/docs"}


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Monitoring"],
    summary="Health check"
)
def get_health():
    """Health check endpoint used by Render and uptime monitors."""
    state = _get_state()
    return {
        "status": "ok",
        "models_loaded": True,
        "questions": len(state.questions_df),
        "companies": len(state.company_profiles),
        "subjects": len(state.subjects),
    }


@app.get(
    "/subjects",
    response_model=List[str],
    tags=["Metadata"],
    summary="List all subjects"
)
def get_subjects():
    """Return the list of all 15 placement and interview subjects."""
    state = _get_state()
    return state.subjects


@app.get(
    "/companies",
    response_model=List[CompanyProfile],
    tags=["Companies"],
    summary="List all company profiles"
)
def get_companies():
    """Return profiles for all 19 tracked hiring companies."""
    state = _get_state()
    return state.company_profiles


@app.get(
    "/companies/{name}",
    response_model=CompanyDetailResponse,
    tags=["Companies"],
    summary="Get single company profile and question stats"
)
def get_company(name: str):
    """Return a single company profile with aggregated question counts by relevance and subject.

    Matches company names case-insensitively and handles URL-encoded spaces
    (e.g., 'ZS Associates', 'ION Group').
    """
    state = _get_state()
    cleaned_name = name.strip().lower()
    profile = state.company_profiles_map.get(cleaned_name)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company '{name}' not found. Available companies: {state.company_names}"
        )

    canonical_name = profile.company
    df = state.questions_df

    # Rows where this company has a mapped relevance
    company_rows = df[df[canonical_name] != ""]
    total_questions = len(company_rows)

    relevance_counts: Dict[str, int] = {"core": 0, "frequent": 0, "occasional": 0}
    for rel, count in company_rows[canonical_name].value_counts().items():
        if rel in relevance_counts:
            relevance_counts[rel] = int(count)

    subject_counts: Dict[str, int] = {}
    for subj, count in company_rows["subject"].value_counts().items():
        subject_counts[str(subj)] = int(count)

    profile_dict = profile.model_dump()
    return CompanyDetailResponse(
        **profile_dict,
        total_questions=total_questions,
        relevance_counts=relevance_counts,
        subject_counts=subject_counts,
        counts_by_relevance=relevance_counts,
        counts_by_subject=subject_counts,
    )


@app.get(
    "/practice",
    response_model=PracticeResponse,
    tags=["Practice"],
    summary="Get practice questions for a company"
)
def get_practice_set(
    company: str = Query(..., description="Target company name (e.g. 'TCS', 'Google', 'ZS Associates')"),
    subject: str = Query("All", description="Subject filter or 'All'"),
    relevance: str = Query("All", description="Relevance filter: 'All', 'core', 'frequent', 'occasional'"),
    difficulty: str = Query("All", description="Difficulty filter: 'All', 'easy', 'medium', 'hard'"),
    n: int = Query(20, ge=1, le=100, description="Number of questions to return (1-100)"),
    seed: Optional[int] = Query(None, description="Optional integer seed for reproducible shuffling"),
):
    """Return a curated practice question set for a target company.

    Applies optional filters on subject, relevance, and difficulty.
    Shuffles deterministically if a seed is provided, preserving stable
    ordering of core -> frequent -> occasional relevance tiers.
    """
    state = _get_state()

    # Match company name case-insensitively
    comp_profile = state.company_profiles_map.get(company.strip().lower())
    if not comp_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company '{company}' not found. Available companies: {state.company_names}"
        )

    canonical_company = comp_profile.company
    df = state.questions_df

    # 1. Base filter: questions relevant to this company
    mask = df[canonical_company] != ""

    # 2. Subject filter
    if subject.strip().lower() != "all":
        mask = mask & (df["subject"].str.lower() == subject.strip().lower())

    # 3. Relevance filter
    valid_relevances = {"all", "core", "frequent", "occasional"}
    rel_clean = relevance.strip().lower()
    if rel_clean not in valid_relevances:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid relevance '{relevance}'. Must be one of: 'All', 'core', 'frequent', 'occasional'."
        )
    if rel_clean != "all":
        mask = mask & (df[canonical_company].str.lower() == rel_clean)

    # 4. Difficulty filter
    valid_difficulties = {"all", "easy", "medium", "hard"}
    diff_clean = difficulty.strip().lower()
    if diff_clean not in valid_difficulties:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid difficulty '{difficulty}'. Must be one of: 'All', 'easy', 'medium', 'hard'."
        )
    if diff_clean != "all":
        mask = mask & (df["difficulty"].str.lower() == diff_clean)

    filtered_df = df[mask]
    total_available = len(filtered_df)

    # Convert matching rows into PracticeQuestion items
    items: List[PracticeQuestion] = []
    for _, row in filtered_df.iterrows():
        items.append(
            PracticeQuestion(
                id=str(row["id"]),
                question=str(row["question"]),
                subject=str(row["subject"]),
                difficulty=str(row["difficulty"]),
                relevance=str(row[canonical_company]),
            )
        )

    # Shuffle with seed (or standard random if seed is None)
    if seed is not None:
        rng = random.Random(seed)
        rng.shuffle(items)
    else:
        random.shuffle(items)

    # Stable sort by relevance tier: core (0) -> frequent (1) -> occasional (2)
    # Python's sort is Timsort (stable), keeping the shuffle order within each tier
    tier_rank = {"core": 0, "frequent": 1, "occasional": 2}
    items.sort(key=lambda item: tier_rank.get(item.relevance.lower(), 99))

    # Take first n items
    returned_items = items[:n]

    return PracticeResponse(
        company=canonical_company,
        total_available=total_available,
        returned=len(returned_items),
        questions=returned_items,
        disclaimer=DISCLAIMER_TEXT,
    )


@app.get(
    "/questions/{id}",
    response_model=QuestionDetailResponse,
    tags=["Questions"],
    summary="Get single question details"
)
def get_question(id: str):
    """Return a single question with subject, difficulty, and all recommended companies."""
    state = _get_state()
    cleaned_id = id.strip().lower()
    row = state.questions_by_id.get(cleaned_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID '{id}' not found."
        )

    # Build company recommendations list
    tier_rank = {"core": 0, "frequent": 1, "occasional": 2}
    companies_rec: List[Dict[str, Any]] = []
    for comp in state.company_names:
        rel = row.get(comp, "")
        if rel:
            companies_rec.append({"company": comp, "relevance": rel})

    # Order companies by relevance (core -> frequent -> occasional), then alphabetically
    companies_rec.sort(key=lambda x: (tier_rank.get(x["relevance"].lower(), 99), x["company"]))
    company_objects = [CompanyRelevance(company=c["company"], relevance=c["relevance"]) for c in companies_rec]

    return QuestionDetailResponse(
        id=str(row["id"]),
        question=str(row["question"]),
        subject=str(row["subject"]),
        difficulty=str(row["difficulty"]),
        companies=company_objects,
    )


@app.post(
    "/analyse",
    response_model=AnalyseResponse,
    tags=["Analysis"],
    summary="Analyse a question"
)
def analyse_question(req: AnalyseRequest):
    """Predict the subject and difficulty of an interview question and recommend target companies.

    Steps:
    1. Predict subject probabilities using the TF-IDF + LogisticRegression pipeline.
    2. Extract the top-predicted subject and the top 3 candidate subjects with probabilities.
    3. Predict difficulty ('easy', 'medium', 'hard') using the TF-IDF + RandomForest pipeline.
    4. Match with company_rules.json to identify companies where the subject is weighted
       and the predicted difficulty matches the company focus.
    """
    state = _get_state()
    question_text = req.question.strip()

    # 1. Subject prediction via predict_proba
    subject_probs = state.subject_model.predict_proba([question_text])[0]
    top_subject_idx = int(np.argmax(subject_probs))
    predicted_subject = state.subject_label_encoder.inverse_transform([top_subject_idx])[0]
    subject_confidence = float(round(float(subject_probs[top_subject_idx]), 4))

    # Top 3 subject candidates
    top3_indices = np.argsort(subject_probs)[::-1][:3]
    subject_candidates = [
        SubjectCandidate(
            subject=state.subject_label_encoder.inverse_transform([idx])[0],
            probability=float(round(float(subject_probs[idx]), 4))
        )
        for idx in top3_indices
    ]

    # 2. Difficulty prediction via predict
    diff_pred_idx = state.difficulty_model.predict([question_text])[0]
    predicted_difficulty = state.difficulty_label_encoder.inverse_transform([diff_pred_idx])[0]

    # 3. Company recommendations via company_rules.json
    weight_to_relevance = {3: "core", 2: "frequent", 1: "occasional"}
    matched_companies = []

    for comp, rule in state.company_rules.items():
        weights = rule.get("weights", {})
        diff_list = rule.get("difficulty", [])

        if predicted_subject in weights and predicted_difficulty in diff_list:
            w = weights[predicted_subject]
            rel = weight_to_relevance.get(w, "occasional")
            matched_companies.append({
                "company": comp,
                "relevance": rel,
                "weight": w
            })

    # Sort core (3) -> frequent (2) -> occasional (1), then alphabetically by company name
    matched_companies.sort(key=lambda x: (-x["weight"], x["company"]))
    recommended_for = [
        CompanyRelevance(company=item["company"], relevance=item["relevance"])
        for item in matched_companies
    ]

    return AnalyseResponse(
        question=question_text,
        subject=predicted_subject,
        subject_confidence=subject_confidence,
        subject_candidates=subject_candidates,
        difficulty=predicted_difficulty,
        recommended_for=recommended_for,
        disclaimer=DISCLAIMER_TEXT,
    )
