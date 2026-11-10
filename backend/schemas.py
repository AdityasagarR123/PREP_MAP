"""Pydantic schemas for the PrepMap API.

These models define and validate the request and response structures
for all endpoints, ensuring type safety and clean auto-generated OpenAPI docs.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class RootResponse(BaseModel):
    """Response model for the root endpoint."""
    name: str = Field(..., examples=["PrepMap API"])
    docs: str = Field(..., examples=["/docs"])


class HealthResponse(BaseModel):
    """Response model for health check monitoring."""
    status: str = Field(..., examples=["ok"])
    models_loaded: bool = Field(..., examples=[True])
    questions: int = Field(..., examples=[1770])
    companies: int = Field(..., examples=[19])
    subjects: int = Field(..., examples=[15])


class CompanyProfile(BaseModel):
    """Profile information for a target hiring company."""
    company: str = Field(..., examples=["TCS"])
    category: str = Field(..., examples=["IT services (mass recruiter)"])
    fresher_roles: str = Field(..., examples=["Ninja, Digital, Prime"])
    hiring_rounds: str = Field(..., examples=["TCS NQT -> technical interview -> managerial -> HR"])
    core_subjects: List[str] = Field(..., examples=[["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"]])
    frequent_subjects: List[str] = Field(default_factory=list, examples=[["DSA", "DBMS & SQL"]])
    occasional_subjects: List[str] = Field(default_factory=list, examples=[["Operating Systems"]])
    difficulty_focus: List[str] = Field(..., examples=[["easy", "medium"]])
    data_confidence: str = Field(..., examples=["medium"])
    notes: str = Field(..., examples=["Digital and Prime offers depend on the advanced coding section."])
    sources: str = Field(..., examples=["https://www.placementpreparation.io/tcs-nqt/syllabus-and-test-pattern/"])


class CompanyDetailResponse(CompanyProfile):
    """Detailed company profile with aggregated question counts."""
    total_questions: int = Field(..., examples=[1002])
    relevance_counts: Dict[str, int] = Field(..., examples=[{"core": 256, "frequent": 496, "occasional": 250}])
    subject_counts: Dict[str, int] = Field(..., examples=[{"DSA": 150, "DBMS & SQL": 100}])
    counts_by_relevance: Optional[Dict[str, int]] = Field(None, description="Alias for relevance_counts")
    counts_by_subject: Optional[Dict[str, int]] = Field(None, description="Alias for subject_counts")


class PracticeQuestion(BaseModel):
    """A practice question mapped to a specific company."""
    id: str = Field(..., examples=["ab-0000"])
    question: str = Field(..., examples=["Reverse a string in place."])
    subject: str = Field(..., examples=["DSA"])
    difficulty: str = Field(..., examples=["easy"])
    relevance: str = Field(..., examples=["core"])


class PracticeResponse(BaseModel):
    """Filtered and ordered practice set for a company."""
    company: str = Field(..., examples=["TCS"])
    total_available: int = Field(..., examples=[1002])
    returned: int = Field(..., examples=[20])
    questions: List[PracticeQuestion]
    disclaimer: str = Field(
        default="Recommended based on each company's public hiring process, not a record of questions the company asked."
    )


class CompanyRelevance(BaseModel):
    """Company relevance mapping item."""
    company: str = Field(..., examples=["Google"])
    relevance: str = Field(..., examples=["core"])


class QuestionDetailResponse(BaseModel):
    """Question metadata and matching company recommendations."""
    id: str = Field(..., examples=["ab-0000"])
    question: str = Field(..., examples=["Reverse a string in place."])
    subject: str = Field(..., examples=["DSA"])
    difficulty: str = Field(..., examples=["easy"])
    companies: List[CompanyRelevance]


class AnalyseRequest(BaseModel):
    """Input payload to classify and recommend a question."""
    question: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Interview or placement question text (3 to 500 characters)",
        examples=["What is a deadlock in operating systems and what conditions cause it?"]
    )


class SubjectCandidate(BaseModel):
    """Subject classification candidate with predicted probability."""
    subject: str = Field(..., examples=["Operating Systems"])
    probability: float = Field(..., examples=[0.9551])


class AnalyseResponse(BaseModel):
    """Subject and difficulty predictions with company recommendations."""
    question: str = Field(..., examples=["What is a deadlock?"])
    subject: str = Field(..., examples=["Operating Systems"])
    subject_confidence: float = Field(..., examples=[0.9551])
    subject_candidates: List[SubjectCandidate]
    difficulty: str = Field(..., examples=["easy"])
    recommended_for: List[CompanyRelevance]
    disclaimer: str = Field(
        default="Recommended based on each company's public hiring process, not a record of questions the company asked."
    )
