# PrepMap Backend API

PrepMap is a placement and technical interview preparation platform designed for students and job seekers. Students can select a target company (e.g. TCS, Infosys, Google, Amazon, ZS Associates) to get curated practice questions aligned with that company's hiring process, or submit any custom question to instantly classify its subject, assess its difficulty, and identify which companies it is recommended for.

The API loads pre-trained machine learning models and dataset artifacts directly from Hugging Face Hub once at startup, keeps them in memory for low-latency inference, and is fully optimized for deployment on Render's free tier.

---

## Hugging Face Repositories

Both repositories are public and require no authentication token:

- **Model Repository:** [adithegod/prepmap_question_classifier](https://huggingface.co/adithegod/prepmap_question_classifier)
  - `subject_model.joblib`: TF-IDF word (1-2 grams) + char (3-5 grams) + Logistic Regression pipeline (15 subject classes, 0.7617 macro F1)
  - `difficulty_model.joblib`: TF-IDF + Random Forest Classifier (500 trees, 3 difficulty tiers: easy, medium, hard)
  - `subject_label_encoder.joblib`: Scikit-learn LabelEncoder mapping IDs to 15 subjects
  - `difficulty_label_encoder.joblib`: Scikit-learn LabelEncoder mapping IDs to easy, medium, hard
  - `company_rules.json`: Company subject weightings (3=core, 2=frequent, 1=occasional) and difficulty focuses
  - `results.json`: 5-fold cross-validation scores and benchmarks
- **Dataset Repository:** [adithegod/asked_before_cs_interview_questions](https://huggingface.co/datasets/adithegod/asked_before_cs_interview_questions)
  - `askedbefore_cs_interview_questions.csv`: 1,770 curated placement questions mapped across 19 companies
  - `company_profiles.csv`: Profile metadata for 19 tracked companies (hiring rounds, fresher roles, test patterns)

---

## 15 Tracked Subjects

1. **DSA**
2. **Operating Systems**
3. **DBMS & SQL**
4. **Computer Networks**
5. **OOP**
6. **System Design**
7. **Machine Learning**
8. **Statistics & Analytics**
9. **Behavioral / HR**
10. **Programming Fundamentals**
11. **Quantitative Aptitude**
12. **Logical Reasoning**
13. **Verbal Ability**
14. **Guesstimates & Case Studies**
15. **Cloud & Security**

---

## Local Development & Setup

### Prerequisites
- Python 3.11.9 (recommended to ensure joblib pickle compatibility with `scikit-learn==1.6.1`)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/AdityasagarR123/PREP_MAP.git
cd PREP_MAP/backend
```

### 2. Create and activate a virtual environment
**On Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**On Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. (Optional) Offline Local Development
If you have downloaded the model files and CSVs locally, you can set the `LOCAL_ARTIFACTS` environment variable to load them directly without contacting Hugging Face:
```bash
export LOCAL_ARTIFACTS="/path/to/downloaded/artifacts"
# Windows PowerShell:
# $env:LOCAL_ARTIFACTS="C:\path\to\artifacts"
```

### 5. Run the development server
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open your browser and navigate to:
- **Interactive OpenAPI Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc UI:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 6. Run the automated test suite
```bash
pytest test_api.py -v
```

---

## API Endpoints & Example Requests

### 1. Root Information
- **`GET /`**
- Returns basic API information and documentation link.
```bash
curl -X GET "http://127.0.0.1:8000/"
```
**Example Response:**
```json
{
  "name": "PrepMap API",
  "docs": "/docs"
}
```

---

### 2. Health Check
- **`GET /health`**
- Monitored by Render to confirm the service is ready to receive traffic.
```bash
curl -X GET "http://127.0.0.1:8000/health"
```
**Example Response:**
```json
{
  "status": "ok",
  "models_loaded": true,
  "questions": 1770,
  "companies": 19,
  "subjects": 15
}
```

---

### 3. List All Subjects
- **`GET /subjects`**
- Returns all 15 subjects recognized by the classification model.
```bash
curl -X GET "http://127.0.0.1:8000/subjects"
```
**Example Response:**
```json
[
  "Behavioral / HR",
  "Cloud & Security",
  "Computer Networks",
  "DBMS & SQL",
  "DSA",
  "Guesstimates & Case Studies",
  "Logical Reasoning",
  "Machine Learning",
  "OOP",
  "Operating Systems",
  "Programming Fundamentals",
  "Quantitative Aptitude",
  "Statistics & Analytics",
  "System Design",
  "Verbal Ability"
]
```

---

### 4. List All Company Profiles
- **`GET /companies`**
- Returns profiles for all 19 companies with hiring rounds, fresher roles, test patterns, and subjects parsed as arrays.
```bash
curl -X GET "http://127.0.0.1:8000/companies"
```

---

### 5. Get Company Detail
- **`GET /companies/{name}`**
- Returns a specific company's profile alongside aggregated question breakdown by relevance (`core`, `frequent`, `occasional`) and by subject. Case-insensitive and supports spaces in names.
```bash
curl -X GET "http://127.0.0.1:8000/companies/ZS%20Associates"
```
**Example Response:**
```json
{
  "company": "ZS Associates",
  "category": "Consulting and analytics",
  "fresher_roles": "Decision Analytics Associate (DAA), Business Technology Analyst (BTA)",
  "hiring_rounds": "Online test (aptitude, SQL, guesstimates, problem solving) -> case study challenge -> technical & case interview -> HR",
  "core_subjects": [
    "Behavioral / HR",
    "DBMS & SQL",
    "Guesstimates & Case Studies",
    "Statistics & Analytics"
  ],
  "frequent_subjects": [
    "Cloud & Security",
    "DSA",
    "Logical Reasoning",
    "Programming Fundamentals",
    "Quantitative Aptitude"
  ],
  "occasional_subjects": [
    "Computer Networks",
    "OOP",
    "Operating Systems",
    "Verbal Ability"
  ],
  "difficulty_focus": [
    "easy",
    "medium",
    "hard"
  ],
  "data_confidence": "medium",
  "notes": "Guesstimates and structured business case thinking are tested rigorously in both rounds.",
  "sources": "https://faceprep.in/article/zs-associates-interview-questions-and-process-face-prep/",
  "total_questions": 900,
  "relevance_counts": {
    "core": 450,
    "frequent": 360,
    "occasional": 90
  },
  "subject_counts": {
    "DBMS & SQL": 150,
    "Statistics & Analytics": 150,
    "Guesstimates & Case Studies": 150,
    "DSA": 90
  }
}
```

---

### 6. Curated Company Practice Set
- **`GET /practice`**
- Query Parameters:
  - `company` (*required*): Target company name (e.g. `TCS`, `Google`, `ZS Associates`)
  - `subject` (*optional*, default: `All`): Filter questions by subject
  - `relevance` (*optional*, default: `All`): `core`, `frequent`, `occasional`, or `All`
  - `difficulty` (*optional*, default: `All`): `easy`, `medium`, `hard`, or `All`
  - `n` (*optional*, default: `20`, min: `1`, max: `100`): Number of questions to return
  - `seed` (*optional*, integer): Random seed for reproducible shuffling
- Questions are shuffled using the seed (or random if omitted) and ordered stably by relevance (`core` -> `frequent` -> `occasional`).
```bash
curl -X GET "http://127.0.0.1:8000/practice?company=TCS&n=5"
```
With subject filter:
```bash
curl -X GET "http://127.0.0.1:8000/practice?company=ZS%20Associates&subject=Guesstimates%20%26%20Case%20Studies&n=5"
```
**Example Response:**
```json
{
  "company": "ZS Associates",
  "total_available": 60,
  "returned": 5,
  "questions": [
    {
      "id": "ab-1650",
      "question": "Estimate the number of smartphones sold in India in a year.",
      "subject": "Guesstimates & Case Studies",
      "difficulty": "easy",
      "relevance": "core"
    },
    {
      "id": "ab-1651",
      "question": "Estimate the number of cars in Delhi.",
      "subject": "Guesstimates & Case Studies",
      "difficulty": "easy",
      "relevance": "core"
    }
  ],
  "disclaimer": "Recommended based on each company's public hiring process, not a record of questions the company asked."
}
```

---

### 7. Get Question by ID
- **`GET /questions/{id}`**
- Looks up question details and returns every company it is recommended for alongside relevance tier.
```bash
curl -X GET "http://127.0.0.1:8000/questions/ab-0000"
```
**Example Response:**
```json
{
  "id": "ab-0000",
  "question": "Reverse a string in place.",
  "subject": "DSA",
  "difficulty": "easy",
  "companies": [
    {"company": "Infosys", "relevance": "core"},
    {"company": "ION Group", "relevance": "core"},
    {"company": "Oracle", "relevance": "core"},
    {"company": "Deloitte", "relevance": "frequent"},
    {"company": "HCLTech", "relevance": "frequent"},
    {"company": "TCS", "relevance": "frequent"},
    {"company": "Wipro", "relevance": "frequent"},
    {"company": "Accenture", "relevance": "occasional"},
    {"company": "Capgemini", "relevance": "occasional"},
    {"company": "Cognizant", "relevance": "occasional"}
  ]
}
```

---

### 8. Analyse and Classify Question
- **`POST /analyse`**
- Body: `{"question": "<text, 3 to 500 characters>"}`
- Predicts subject, outputs top 3 candidate subjects with confidence probabilities, predicts difficulty, and looks up companies from `company_rules.json` that test this subject and difficulty.
```bash
curl -X POST "http://127.0.0.1:8000/analyse" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is a deadlock and what four conditions are necessary for deadlock to occur?"}'
```
**Example Response:**
```json
{
  "question": "What is a deadlock and what four conditions are necessary for deadlock to occur?",
  "subject": "Operating Systems",
  "subject_confidence": 0.9852,
  "subject_candidates": [
    {"subject": "Operating Systems", "probability": 0.9852},
    {"subject": "DBMS & SQL", "probability": 0.0064},
    {"subject": "System Design", "probability": 0.0031}
  ],
  "difficulty": "easy",
  "recommended_for": [
    {"company": "ION Group", "relevance": "core"},
    {"company": "HCLTech", "relevance": "frequent"},
    {"company": "Oracle", "relevance": "frequent"},
    {"company": "Capgemini", "relevance": "occasional"},
    {"company": "Infosys", "relevance": "occasional"},
    {"company": "TCS", "relevance": "occasional"}
  ],
  "disclaimer": "Recommended based on each company's public hiring process, not a record of questions the company asked."
}
```

---

## Render Deployment (Free Plan)

Render automatically builds and runs the service using the included `render.yaml` blueprint at the repository root.

### Steps to Deploy:

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "feat: complete PrepMap backend API with Render configuration"
   git push origin main
   ```
2. **Log in to [Render Dashboard](https://dashboard.render.com).**
3. **Create New Blueprint Instance:**
   - Click **New +** in the top right corner.
   - Select **Blueprint**.
   - Connect your GitHub repository: `https://github.com/AdityasagarR123/PREP_MAP`.
   - Render detects `render.yaml` automatically and configures the `prepmap-api` web service.
4. **Environment Variables Configured by `render.yaml`:**
   - `PYTHON_VERSION`: `3.11.9`
   - `ALLOWED_ORIGINS`: `*` (can be updated to your Vercel frontend URL once deployed)
   - `MODEL_REPO`: `adithegod/prepmap-question-classifier`
   - `DATASET_REPO`: `adithegod/askedbefore-cs-interview-questions`
   - `HF_HOME`: `/opt/render/project/src/.hf_cache` (caches downloads inside the service directory)
5. **Click "Apply".**
   - Render executes `pip install -r requirements.txt`.
   - The FastAPI lifespan handler downloads the models and datasets from Hugging Face.
   - Render verifies health check at `/health`.
6. **Verify Deployment:**
   - Test health check: `https://prepmap-api.onrender.com/health`
   - Explore docs: `https://prepmap-api.onrender.com/docs`

> [!NOTE]
> On Render's free tier, the instance will spin down after ~15 minutes of inactivity. When a new request arrives, Render spins the container back up and reloads the cached models in ~30-60 seconds. All subsequent requests respond in milliseconds.
