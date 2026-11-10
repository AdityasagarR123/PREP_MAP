"""Artifact loader module for PrepMap API.

Loads machine learning models, encoders, datasets, and company rules from
Hugging Face Hub (or an optional local artifacts directory) once at startup.
"""

import gc
import json
import logging
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import pandas as pd
from huggingface_hub import hf_hub_download

from schemas import CompanyProfile

logger = logging.getLogger("prepmap.loader")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

# Canonical 19 company profiles fallback (used if company_profiles.csv is not yet present on HF)
FALLBACK_COMPANY_PROFILES = [
    {
        "company": "TCS",
        "category": "IT services (mass recruiter)",
        "fresher_roles": "Ninja, Digital, Prime",
        "hiring_rounds": "TCS NQT (numerical, verbal and reasoning foundation section; advanced quant, reasoning and 3 coding problems) -> technical interview -> managerial -> HR",
        "core_subjects": "Logical Reasoning; Programming Fundamentals; Quantitative Aptitude; Verbal Ability",
        "frequent_subjects": "Behavioral / HR; DBMS & SQL; DSA; OOP",
        "occasional_subjects": "Computer Networks; Operating Systems",
        "difficulty_focus": "easy; medium",
        "data_confidence": "medium",
        "notes": "Digital and Prime offers depend on the advanced coding section, so practise medium to hard DSA for those roles.",
        "sources": "https://www.placementpreparation.io/tcs-nqt/syllabus-and-test-pattern/"
    },
    {
        "company": "Infosys",
        "category": "IT services (mass recruiter)",
        "fresher_roles": "System Engineer, Digital Specialist Engineer (DSE), Specialist Programmer (SP)",
        "hiring_rounds": "Online test (3 to 4 coding problems from easy to hard for SP/DSE) -> technical interview (live DSA, OOP, DBMS/SQL, projects; system design for SP) -> HR",
        "core_subjects": "DBMS & SQL; DSA; OOP",
        "frequent_subjects": "Behavioral / HR; Programming Fundamentals; System Design",
        "occasional_subjects": "Logical Reasoning; Operating Systems; Quantitative Aptitude",
        "difficulty_focus": "easy; medium; hard",
        "data_confidence": "medium",
        "notes": "SP needs medium to hard DSA (DP, graphs, segment trees). DSE and System Engineer roles are easier.",
        "sources": "https://www.mygreatlearning.com/blog/infosys-sp-dse-interview-guide-2026/"
    },
    {
        "company": "Wipro",
        "category": "IT services (mass recruiter)",
        "fresher_roles": "Project Engineer (Elite NTH), Turbo",
        "hiring_rounds": "Elite NTH (quant, logical, verbal aptitude; written essay; 2 coding problems) -> technical interview -> HR",
        "core_subjects": "Logical Reasoning; Programming Fundamentals; Quantitative Aptitude; Verbal Ability",
        "frequent_subjects": "Behavioral / HR; DSA",
        "occasional_subjects": "DBMS & SQL; OOP",
        "difficulty_focus": "easy; medium",
        "data_confidence": "medium",
        "notes": "The written essay round is part of the Verbal Ability practice.",
        "sources": "https://placementpreparation.io/blog/wipro-elite-nth-syllabus-and-test-pattern"
    },
    {
        "company": "Accenture",
        "category": "IT services (mass recruiter)",
        "fresher_roles": "Associate Software Engineer, Packaged App Development Associate",
        "hiring_rounds": "Cognitive assessment (verbal, reasoning, numerical) -> technical assessment (MS Office, pseudocode, networking, security, cloud) -> 2 coding problems -> communication test -> interview",
        "core_subjects": "Cloud & Security; Logical Reasoning; Programming Fundamentals; Verbal Ability",
        "frequent_subjects": "Behavioral / HR; Computer Networks; Quantitative Aptitude",
        "occasional_subjects": "DSA",
        "difficulty_focus": "easy; medium",
        "data_confidence": "medium",
        "notes": "Pseudocode tracing and cloud/security basics are distinctive to Accenture's technical assessment.",
        "sources": "https://www.placementpreparation.io/accenture/syllabus-and-test-pattern/"
    },
    {
        "company": "Cognizant",
        "category": "IT services (mass recruiter)",
        "fresher_roles": "GenC, GenC Next, GenC Elevate",
        "hiring_rounds": "Communication test -> aptitude (numerical, reasoning, verbal) -> technical tasks (Java + SQL + web UI, or Python + SQL + cloud) -> interview",
        "core_subjects": "DBMS & SQL; Logical Reasoning; Programming Fundamentals; Quantitative Aptitude; Verbal Ability",
        "frequent_subjects": "Behavioral / HR; Cloud & Security",
        "occasional_subjects": "DSA; OOP",
        "difficulty_focus": "easy; medium",
        "data_confidence": "medium",
        "notes": "SQL is a large share of the GenC Next technical round in both clusters.",
        "sources": "https://www.placementpreparation.io/cognizant-genc-next/syllabus-and-test-pattern/"
    },
    {
        "company": "Capgemini",
        "category": "IT services (mass recruiter)",
        "fresher_roles": "Analyst, Senior Analyst",
        "hiring_rounds": "Game-based aptitude -> pseudocode round -> coding (Senior Analyst) -> technical interview (programming, DBMS/SQL, OS, networking, project) -> HR",
        "core_subjects": "Behavioral / HR; Logical Reasoning; Programming Fundamentals",
        "frequent_subjects": "DBMS & SQL; OOP; Quantitative Aptitude; Verbal Ability",
        "occasional_subjects": "Computer Networks; DSA; Operating Systems",
        "difficulty_focus": "easy; medium",
        "data_confidence": "medium",
        "notes": "The game-based aptitude rewards pattern and memory skills, which Logical Reasoning practice helps with.",
        "sources": "https://jobrise.io/en/blog/capgemini-interview-questions-freshers-2026/"
    },
    {
        "company": "HCLTech",
        "category": "IT services (mass recruiter)",
        "fresher_roles": "Graduate Engineer Trainee, TechBee",
        "hiring_rounds": "Online test (quant, logical, verbal, technical MCQs, coding) -> technical interview (DSA, DBMS, OS, networks, OOP, SDLC) -> HR",
        "core_subjects": "Logical Reasoning; Quantitative Aptitude",
        "frequent_subjects": "Behavioral / HR; Computer Networks; DBMS & SQL; DSA; OOP; Operating Systems; Programming Fundamentals; Verbal Ability",
        "occasional_subjects": "",
        "difficulty_focus": "easy; medium",
        "data_confidence": "medium",
        "notes": "Core CS technical MCQs carry significant weight alongside aptitude.",
        "sources": "https://www.placementpreparation.io/hcl/recruitment-process/"
    },
    {
        "company": "Deloitte",
        "category": "Consulting and technology services",
        "fresher_roles": "Analyst (Risk & Financial Advisory, Technology Consulting)",
        "hiring_rounds": "Aptitude test (verbal, numerical, logical) -> technical MCQs (cloud, security, DBMS, programming) -> technical interview -> partner interview",
        "core_subjects": "Cloud & Security",
        "frequent_subjects": "Behavioral / HR; DBMS & SQL; DSA; Logical Reasoning; Programming Fundamentals; Quantitative Aptitude; Verbal Ability",
        "occasional_subjects": "Operating Systems",
        "difficulty_focus": "easy; medium",
        "data_confidence": "medium",
        "notes": "Deloitte's tech tracks focus on enterprise cloud and security infrastructure.",
        "sources": "https://www.placementpreparation.io/deloitte/recruitment-process/"
    },
    {
        "company": "ZS Associates",
        "category": "Consulting and analytics",
        "fresher_roles": "Decision Analytics Associate (DAA), Business Technology Analyst (BTA)",
        "hiring_rounds": "Online test (aptitude, SQL, guesstimates, problem solving) -> case study challenge -> technical & case interview -> HR",
        "core_subjects": "Behavioral / HR; DBMS & SQL; Guesstimates & Case Studies; Statistics & Analytics",
        "frequent_subjects": "Cloud & Security; DSA; Logical Reasoning; Programming Fundamentals; Quantitative Aptitude",
        "occasional_subjects": "Computer Networks; OOP; Operating Systems; Verbal Ability",
        "difficulty_focus": "easy; medium; hard",
        "data_confidence": "medium",
        "notes": "Guesstimates and structured business case thinking are tested rigorously in both rounds.",
        "sources": "https://faceprep.in/article/zs-associates-interview-questions-and-process-face-prep/"
    },
    {
        "company": "ION Group",
        "category": "Fintech and trading software",
        "fresher_roles": "Software Developer (C++ / Core Java), Quantitative Developer",
        "hiring_rounds": "Aptitude & CS fundamentals online test -> 2 technical coding rounds (DSA, low-level multithreading, memory management, OS) -> managerial -> HR",
        "core_subjects": "DSA; OOP; Operating Systems; Programming Fundamentals",
        "frequent_subjects": "Behavioral / HR; Computer Networks; DBMS & SQL; Quantitative Aptitude",
        "occasional_subjects": "Logical Reasoning; Verbal Ability",
        "difficulty_focus": "easy; medium; hard",
        "data_confidence": "medium",
        "notes": "High expectations on OS internals (processes, locks, memory) and OOP architecture.",
        "sources": "https://lets-code.co.in/previousyearcodingquestion/ion-group-previous-year-coding-questions"
    },
    {
        "company": "Oracle",
        "category": "Enterprise software",
        "fresher_roles": "Associate Software Engineer, Server Technology Engineer",
        "hiring_rounds": "Online assessment (DSA, CS fundamentals, SQL) -> 3 technical rounds (deep DSA, relational database internals, OS, system architecture) -> HR",
        "core_subjects": "DBMS & SQL; DSA",
        "frequent_subjects": "Behavioral / HR; Computer Networks; OOP; Operating Systems",
        "occasional_subjects": "Programming Fundamentals; System Design",
        "difficulty_focus": "easy; medium; hard",
        "data_confidence": "medium",
        "notes": "In-depth questions on indexing, transactions, ACID, and complex SQL joins.",
        "sources": "https://www.placementpreparation.io/blog/oracle-interview-questions-and-experience/"
    },
    {
        "company": "Adobe",
        "category": "Product company",
        "fresher_roles": "Software Development Engineer (MTS-1)",
        "hiring_rounds": "Online coding test (3 medium to hard DSA problems) -> 3 to 4 technical interviews (advanced DSA, OOP, OS/multithreading) -> HR",
        "core_subjects": "DSA",
        "frequent_subjects": "Behavioral / HR; Computer Networks; DBMS & SQL; OOP; Operating Systems; Programming Fundamentals",
        "occasional_subjects": "Logical Reasoning; Quantitative Aptitude",
        "difficulty_focus": "medium; hard",
        "data_confidence": "medium",
        "notes": "Interviews are medium to hard. Dynamic programming and memory management come up often.",
        "sources": "https://unstop.com/blog/adobe-recruitment-process/amp"
    },
    {
        "company": "Blinkit",
        "category": "Product company (Indian startup)",
        "fresher_roles": "SDE-1, SDE Intern",
        "hiring_rounds": "Mostly DSA coding rounds according to limited public reports; backend roles may include design discussion",
        "core_subjects": "DSA",
        "frequent_subjects": "",
        "occasional_subjects": "Behavioral / HR; DBMS & SQL; OOP; System Design",
        "difficulty_focus": "medium; hard",
        "data_confidence": "low",
        "notes": "Very little public data. Treat this profile as a starting point and update it with real reports.",
        "sources": "https://ambitionbox.com/interviews/blinkit-interview-questions/sde"
    },
    {
        "company": "Google",
        "category": "Big Tech (FAANG/MAANG)",
        "fresher_roles": "Software Engineer (new grad), STEP and SWE interns",
        "hiring_rounds": "Recruiter call -> technical phone screen (DSA) -> 4 to 6 onsite rounds (mostly coding, some system design, optional behavioural) -> hiring committee -> team matching",
        "core_subjects": "DSA",
        "frequent_subjects": "System Design",
        "occasional_subjects": "Behavioral / HR",
        "difficulty_focus": "medium; hard",
        "data_confidence": "medium",
        "notes": "Coding dominates. System design weight grows with experience level.",
        "sources": "https://interviewing.io/guides/hiring-process/google"
    },
    {
        "company": "Microsoft",
        "category": "Big Tech (FAANG/MAANG)",
        "fresher_roles": "Software Engineer (SDE), SWE intern",
        "hiring_rounds": "Online coding test (2 to 3 problems) -> up to 3 technical rounds (DSA; fresher-level system design; OS, DBMS, networks and projects) -> HR",
        "core_subjects": "DSA",
        "frequent_subjects": "Behavioral / HR; Computer Networks; DBMS & SQL; Operating Systems; System Design",
        "occasional_subjects": "OOP",
        "difficulty_focus": "medium; hard",
        "data_confidence": "medium",
        "notes": "Core CS fundamentals are asked more than at Google or Meta.",
        "sources": "https://www.faceprep.in/article/microsoft-recruitment-process-for-freshers-faceprep/"
    },
    {
        "company": "Amazon",
        "category": "Big Tech (FAANG/MAANG)",
        "fresher_roles": "SDE-1, SDE intern",
        "hiring_rounds": "Online assessment (coding) -> interviews on data structures, algorithms, coding, system design and object-oriented design, plus Leadership Principles behavioural questions in every round",
        "core_subjects": "Behavioral / HR; DSA",
        "frequent_subjects": "OOP; System Design",
        "occasional_subjects": "Computer Networks; DBMS & SQL; Machine Learning; Operating Systems",
        "difficulty_focus": "medium; hard",
        "data_confidence": "high",
        "notes": "Amazon's official prep page lists the technical topics. Leadership Principles stories are needed for every round.",
        "sources": "https://amazon.jobs/content/en/how-we-hire/interview-prep/software-development-topics"
    },
    {
        "company": "Meta",
        "category": "Big Tech (FAANG/MAANG)",
        "fresher_roles": "Software Engineer (E3 new grad), SWE intern",
        "hiring_rounds": "Coding screen -> virtual onsite with 2 coding rounds (two medium problems each) and 1 behavioural round; no system design at new grad level",
        "core_subjects": "Behavioral / HR; DSA",
        "frequent_subjects": "",
        "occasional_subjects": "System Design",
        "difficulty_focus": "medium; hard",
        "data_confidence": "medium",
        "notes": "Speed matters: aim to solve a medium problem in about 15 minutes.",
        "sources": "https://simplify.jobs/blog/meta-new-grad-swe-interview"
    },
    {
        "company": "Apple",
        "category": "Big Tech (FAANG/MAANG)",
        "fresher_roles": "Software Engineer (team specific)",
        "hiring_rounds": "Recruiter call or online assessment -> technical phone screen -> 6 to 8 team-specific onsite rounds (coding, domain or language deep dives, system design, behavioural)",
        "core_subjects": "Behavioral / HR",
        "frequent_subjects": "DSA; Programming Fundamentals; System Design",
        "occasional_subjects": "Operating Systems",
        "difficulty_focus": "medium; hard",
        "data_confidence": "medium",
        "notes": "Each team writes its own questions. Expect 'Why Apple?' and deep dives on your main language.",
        "sources": "https://interviewing.io/apple-interview-questions"
    },
    {
        "company": "Netflix",
        "category": "Big Tech (FAANG/MAANG)",
        "fresher_roles": "Software Engineer (L3 new grad is limited; most hiring is experienced)",
        "hiring_rounds": "Recruiter screen -> technical screen -> hiring manager -> 4 to 5 onsite rounds (practical or DSA coding, system design, culture and behavioural)",
        "core_subjects": "Behavioral / HR; System Design",
        "frequent_subjects": "DSA",
        "occasional_subjects": "",
        "difficulty_focus": "medium; hard",
        "data_confidence": "medium",
        "notes": "Culture memo topics (feedback, dissent, ambiguity) come up repeatedly.",
        "sources": "https://www.tryexponent.com/guides/netflix-software-engineer-interview"
    }
]


@dataclass
class AppState:
    """Holds all in-memory loaded models, encoders, datasets, and metadata."""
    subject_model: Any
    difficulty_model: Any
    subject_label_encoder: Any
    difficulty_label_encoder: Any
    company_rules: Dict[str, Any]
    questions_df: pd.DataFrame
    companies_df: pd.DataFrame
    company_profiles: List[CompanyProfile]
    company_profiles_map: Dict[str, CompanyProfile] = field(default_factory=dict)
    questions_by_id: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    subjects: List[str] = field(default_factory=list)
    company_names: List[str] = field(default_factory=list)


def _split_subjects(val: Any) -> List[str]:
    """Helper to parse a semicolon-separated string of subjects into a clean list."""
    if isinstance(val, list):
        return [str(s).strip() for s in val if str(s).strip()]
    if not val or pd.isna(val):
        return []
    return [s.strip() for s in str(val).split(";") if s.strip()]


def _fetch_file(
    repo_id: str,
    filename: str,
    repo_type: str,
    local_dir: Optional[str] = None,
    hf_token: Optional[str] = None,
    allow_missing: bool = False
) -> Optional[str]:
    """Fetch an artifact either from a local directory or from Hugging Face Hub."""
    # 1. Check local artifacts folder first if specified
    if local_dir:
        local_path = Path(local_dir) / filename
        if local_path.is_file():
            logger.info("Found local artifact: %s", local_path)
            return str(local_path)
        logger.warning("File %s not in LOCAL_ARTIFACTS (%s)", filename, local_dir)

    # 2. Download from Hugging Face Hub
    # If no token provided or empty, pass token=False to prevent huggingface_hub from
    # attempting to use any expired local token file.
    token_param = hf_token if hf_token else False

    # Build repo candidate variants to handle naming differences (e.g., hyphens vs underscores)
    candidates = [repo_id]
    variant1 = repo_id.replace("-", "_")
    if variant1 not in candidates:
        candidates.append(variant1)
    variant2 = repo_id.replace("askedbefore", "asked_before")
    if variant2 not in candidates:
        candidates.append(variant2)
    variant3 = repo_id.replace("askedbefore", "asked_before").replace("-", "_")
    if variant3 not in candidates:
        candidates.append(variant3)

    last_error: Optional[Exception] = None
    for candidate in candidates:
        try:
            logger.info("Downloading %s from Hugging Face repo '%s' (%s)...", filename, candidate, repo_type)
            start_t = time.time()
            downloaded_path = hf_hub_download(
                repo_id=candidate,
                filename=filename,
                repo_type=repo_type,
                token=token_param
            )
            elapsed = time.time() - start_t
            logger.info("Successfully fetched %s from %s in %.2fs -> %s", filename, candidate, elapsed, downloaded_path)
            return downloaded_path
        except Exception as exc:
            last_error = exc
            logger.debug("Candidate repo '%s' failed for %s: %s", candidate, filename, exc)

    if allow_missing:
        logger.warning("Artifact %s could not be found on Hugging Face (will use fallback).", filename)
        return None

    err_msg = (
        f"Failed to load required artifact '{filename}' from Hugging Face ({repo_id}). "
        f"Underlying error: {last_error}. "
        f"Please verify scikit-learn version matches 1.6.1 and that repositories are public."
    )
    logger.error(err_msg)
    raise RuntimeError(err_msg) from last_error


def load_artifacts() -> AppState:
    """Load all models, encoders, and datasets into memory once at startup."""
    start_total = time.time()
    logger.info("================ Starting PrepMap Artifact Loading ================")

    model_repo = os.environ.get("MODEL_REPO", "adithegod/prepmap-question-classifier").strip()
    dataset_repo = os.environ.get("DATASET_REPO", "adithegod/askedbefore-cs-interview-questions").strip()
    hf_token = os.environ.get("HF_TOKEN")
    local_artifacts = os.environ.get("LOCAL_ARTIFACTS")

    logger.info("Configuration: MODEL_REPO=%s", model_repo)
    logger.info("Configuration: DATASET_REPO=%s", dataset_repo)
    logger.info("Configuration: LOCAL_ARTIFACTS=%s", local_artifacts or "None")

    # 1. Subject Label Encoder
    try:
        t0 = time.time()
        sle_path = _fetch_file(model_repo, "subject_label_encoder.joblib", "model", local_artifacts, hf_token)
        subject_label_encoder = joblib.load(sle_path)
        logger.info("Loaded subject_label_encoder in %.2fs (%d classes)", time.time() - t0, len(subject_label_encoder.classes_))
    except Exception as e:
        raise RuntimeError(
            f"Failed to load subject_label_encoder.joblib: {e}. Check scikit-learn==1.6.1 is installed."
        ) from e

    # 2. Difficulty Label Encoder
    try:
        t0 = time.time()
        dle_path = _fetch_file(model_repo, "difficulty_label_encoder.joblib", "model", local_artifacts, hf_token)
        difficulty_label_encoder = joblib.load(dle_path)
        logger.info("Loaded difficulty_label_encoder in %.2fs (%s)", time.time() - t0, list(difficulty_label_encoder.classes_))
    except Exception as e:
        raise RuntimeError(
            f"Failed to load difficulty_label_encoder.joblib: {e}. Check scikit-learn==1.6.1 is installed."
        ) from e

    # 3. Subject Classification Model (Logistic Regression Pipeline)
    try:
        t0 = time.time()
        sm_path = _fetch_file(model_repo, "subject_model.joblib", "model", local_artifacts, hf_token)
        subject_model = joblib.load(sm_path)
        logger.info("Loaded subject_model in %.2fs", time.time() - t0)
    except Exception as e:
        raise RuntimeError(
            f"Failed to load subject_model.joblib: {e}. Check scikit-learn==1.6.1 is installed."
        ) from e

    # 4. Difficulty Classification Model (Random Forest Pipeline)
    try:
        t0 = time.time()
        dm_path = _fetch_file(model_repo, "difficulty_model.joblib", "model", local_artifacts, hf_token)
        difficulty_model = joblib.load(dm_path)
        logger.info("Loaded difficulty_model in %.2fs", time.time() - t0)
    except Exception as e:
        raise RuntimeError(
            f"Failed to load difficulty_model.joblib: {e}. Check scikit-learn==1.6.1 is installed."
        ) from e

    # 5. Company Rules JSON
    try:
        t0 = time.time()
        rules_path = _fetch_file(model_repo, "company_rules.json", "model", local_artifacts, hf_token)
        with open(rules_path, "r", encoding="utf-8") as f:
            company_rules = json.load(f)
        logger.info("Loaded company_rules in %.2fs (%d companies)", time.time() - t0, len(company_rules))
    except Exception as e:
        raise RuntimeError(f"Failed to load company_rules.json: {e}") from e

    # 6. Questions Dataset CSV (read with keep_default_na=False so blanks remain "")
    try:
        t0 = time.time()
        q_path = _fetch_file(dataset_repo, "askedbefore_cs_interview_questions.csv", "dataset", local_artifacts, hf_token)
        questions_df = pd.read_csv(q_path, keep_default_na=False)
        logger.info("Loaded questions_df in %.2fs: shape %s", time.time() - t0, questions_df.shape)
    except Exception as e:
        raise RuntimeError(f"Failed to load askedbefore_cs_interview_questions.csv: {e}") from e

    # 7. Company Profiles CSV (with fallback if missing on remote repo)
    try:
        t0 = time.time()
        comp_path = _fetch_file(
            dataset_repo,
            "company_profiles.csv",
            "dataset",
            local_artifacts,
            hf_token,
            allow_missing=True
        )
        if comp_path and Path(comp_path).is_file():
            companies_df = pd.read_csv(comp_path, keep_default_na=False)
            logger.info("Loaded company_profiles.csv in %.2fs: %d companies", time.time() - t0, len(companies_df))
        else:
            logger.warning("Using built-in fallback company profiles (19 companies)")
            companies_df = pd.DataFrame(FALLBACK_COMPANY_PROFILES)
    except Exception as e:
        logger.warning("Error reading company_profiles.csv (%s), using built-in fallback profiles.", e)
        companies_df = pd.DataFrame(FALLBACK_COMPANY_PROFILES)

    # Transform company profiles into Pydantic models with subject fields as arrays
    company_profiles_list: List[CompanyProfile] = []
    company_profiles_map: Dict[str, CompanyProfile] = {}
    for _, row in companies_df.iterrows():
        prof = CompanyProfile(
            company=str(row["company"]),
            category=str(row["category"]),
            fresher_roles=str(row["fresher_roles"]),
            hiring_rounds=str(row["hiring_rounds"]),
            core_subjects=_split_subjects(row["core_subjects"]),
            frequent_subjects=_split_subjects(row["frequent_subjects"]),
            occasional_subjects=_split_subjects(row["occasional_subjects"]),
            difficulty_focus=_split_subjects(row["difficulty_focus"]),
            data_confidence=str(row["data_confidence"]),
            notes=str(row["notes"]),
            sources=str(row["sources"])
        )
        company_profiles_list.append(prof)
        company_profiles_map[prof.company.lower()] = prof

    # Pre-index questions by ID (lowercase) for O(1) lookups
    questions_by_id: Dict[str, Dict[str, Any]] = {}
    for _, row in questions_df.iterrows():
        qid = str(row["id"]).strip().lower()
        questions_by_id[qid] = row.to_dict()

    subjects_list = [str(s) for s in subject_label_encoder.classes_]
    company_names = [p.company for p in company_profiles_list]

    # Free any intermediate memory
    gc.collect()

    total_time = time.time() - start_total
    logger.info(
        "PrepMap artifacts successfully initialized in %.2fs: %d questions, %d companies, %d subjects",
        total_time, len(questions_df), len(company_profiles_list), len(subjects_list)
    )

    return AppState(
        subject_model=subject_model,
        difficulty_model=difficulty_model,
        subject_label_encoder=subject_label_encoder,
        difficulty_label_encoder=difficulty_label_encoder,
        company_rules=company_rules,
        questions_df=questions_df,
        companies_df=companies_df,
        company_profiles=company_profiles_list,
        company_profiles_map=company_profiles_map,
        questions_by_id=questions_by_id,
        subjects=subjects_list,
        company_names=company_names
    )
