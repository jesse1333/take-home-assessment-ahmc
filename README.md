# Architecture Overview

I decided to create a small mono-repo with two packages:

- **apps/web**: The frontend website containing UI for pasting a new note, uploading PDF/DOCX, and for viewing the cases.  
- **apps/api**: REST API for cases, including logic for creating, generating, and structuring case output leveraging the Gemini API.  

---

# User Flows

## 1. New Case — Paste Text, then Generate

User opens the app and stays on New Case (or uses that flow from the landing experience).  
User pastes unstructured clinical text in the text area and clicks Generate Analysis.  

Frontend calls `POST /api/cases` with `{ original_note }`. The backend inserts a row in Supabase and returns a case ID.  

Frontend calls `POST /api/cases/:id/generate` with that ID. The backend loads the stored note, runs the model, writes `ai_generated_data`, and returns the full case.  

User reviews structured fields + Revised HPI; if they change anything and click Save Edits, the client calls:  
`PATCH /api/cases/:id` with `{ user_edited_data }` (not part of the “Generate” flow itself).  

---

## 2. New Case — Upload Document (PDF/DOCX), then Review

User goes to Upload Document, picks a file, and runs the upload action.  

Frontend calls `POST /api/cases/upload` (multipart document).  

The backend:
- Extracts text  
- Creates the case  
- Runs generation in one step  
- Returns the case (with ID and `ai_generated_data`)  

There is no separate `POST /api/cases + POST .../generate` for this path.  

Optional Save Edits utilizes the same:  
`PATCH /api/cases/:id`  

---

## 3. Other Actions

- Saved Cases list: `GET /api/cases`  
- Opening one case: `GET /api/cases/:id`  
- Delete a case: `DELETE /api/cases/:id`  

---

# Tech Stack Choices & Why

## Frontend: React, Next.js & Tailwind CSS  
I chose React and Next.js for the frontend because of how intuitive they make building dynamic, state-driven UI components. I used Next.js as it provides clean file-based routing and an effortless deployment pipeline, while Tailwind CSS was utilized to enable fast, highly functional UI prototyping within the project's time constraints.

## Backend: Node.js & Express  
I chose Node.js and Express to build a lightweight, dedicated REST API. While Next.js offers built-in API routes, maintaining a standalone Express server provides a much cleaner separation of concerns. Node.js also has a wealth of libraries that help with parsing documents like PDFs and DOCX. Plus, context switching between the frontend and backend did not become an issue because both environments use JS.

## Database: PostgreSQL (via Supabase)  
I chose PostgreSQL as the core database engine specifically for its powerful, native JSONB support. Because clinical data extracted by LLMs is inherently dynamic, a patient's structured output may vary from case to case. Building this with traditional columns would be too inflexible to support potentially missing or variable fields in each generation. JSONB solves this by storing `ai_generated_data` and `user_edited_data` as flexible, schema-less objects. For infrastructure, I chose to use Supabase because of its managed hosting and intuitive UI.

## LLM: Google Gemini  
I chose Google Gemini for the LLM because its gemini-2.5-flash model allowed for unlimited free API calls, and it had excellent capabilities for parsing unstructured text. It was the model that made the most sense when balancing the project's budget constraints with the required functionality.

---

# Clinical Note Processing & Generation

## How I Structured the Clinical Note  
I structured the clinical note as a single JSON object with the following keys:  
- chief complaint  
- HPI summary  
- key findings (array)  
- suspected conditions (array)  
- disposition  
- uncertainties  
- revised HPI  

## How I Generated the Revised HPI  
I generated the Revised HPI using a hybrid approach.  

I utilized a rule-based deterministic approach first, searching for specific phrases using regex to get context for information that is 100% factual and accurate as a baseline.  

Then, using the context gathered, I utilized an LLM model to generate a Revised HPI using specific guidelines.  

First, I gave it context of what its goal is, and then gave it 5 specific rules to abide by when generating. The most important rule was to never invent, infer, or hallucinate any data.  

If a required piece of information was missing, the LLM was to explicitly state it was “Not documented.”  

I also gave it the context that was gathered from the rule-based approach to include in its generation. Lastly, I gave it a sample input, which was provided from Case A in the assessment files.

## How I Handled Uncertainty or Missing Information  
In clinical documentation, preventing AI hallucination is extremely important.  

To handle missing information, I implemented strict, explicit guardrails within the LLM prompt instructing it to never invent, infer, or guess data.  

If a required data point was missing from the source text, the model was instructed to explicitly output "Not documented" or log it in an uncertainties array rather than attempting to fill the gap with assumptions.  

Furthermore, the hybrid rule-based extraction acted as a primary defense mechanism against hallucination by force-feeding undeniable facts into the LLM's context window before generation began, significantly increasing the reliability and safety of the final output.

---

# Local Setup & Deployment

**Link to deployed application:**  
https://take-home-assessment-ahmc-web.vercel.app/

**Note:**  
Because this project uses the free tier of Google AI Studio (gemini-2.5-flash), it is subject to strict global rate limits. If you receive a 429 (Resource Exhausted) or 500 error when clicking "Generate," it means the free API quota has temporarily been throttled by Google. Please simply wait a few seconds and try generating again.

---

## How to run the project locally

### Install dependencies

Frontend:
cd apps/web
npm install

Backend:
cd apps/api
npm install

---

## Set Up Environment Variables

Backend (.env in apps/api):
PORT=8000
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

Frontend (.env.local in apps/web):
NEXT_PUBLIC_API_URL=http://localhost:8000

---

## Run the project

Terminal 1 (Backend):
cd apps/api
node src/index.js

Terminal 2 (Frontend):
cd apps/web
npm run dev

---

# AI / Tool Usage Disclosure

## 1. Which AI-assisted tools you used  
I used Cursor and the Claude LLM to assist me throughout development.

## 2. What prompts you used  
Examples:
"Create an empty React component using Tailwind CSS with a textarea tag for user input."
"Create a POST route using Express.js for /api/cases/:id/generate with basic error handling."
"Add a mb-2 on the save button component."
"Why am I getting a 429 error? What does this mean?"

## 3. Which parts were AI-generated  
- Boilerplate & Skeletons  
- Autocomplete  
- Regex Context  

## 4. Which parts you manually implemented  
- React components  
- State management  
- API logic  
- UI styling  
- Supabase queries  
- Document parsing integration  

## 5. Verification  
Tested against Case A (matched answer key) and validated manually with Case B.

---

# Future Improvements

- User Accounts  
- Multiple Document Uploads  
- Stronger Clinical Generation  
