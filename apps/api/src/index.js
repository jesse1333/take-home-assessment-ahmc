const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");
const mammoth = require("mammoth");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini setup 
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TRACKED_FIELDS = [
  "chiefComplaint",
  "hpiSummary",
  "keyFindings",
  "suspectedConditions",
  "dispositionRecommendation",
  "uncertainties",
  "revisedHpi",
];

const normalizeValue = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return "";
  return value;
};

const buildFieldSource = ({ aiData = {}, userData = {} }) => {
  const source = {};
  for (const field of TRACKED_FIELDS) {
    const aiValue = normalizeValue(aiData?.[field]);
    const userValue = normalizeValue(userData?.[field]);
    source[field] =
      JSON.stringify(aiValue) === JSON.stringify(userValue)
        ? "ai_generated"
        : "edited_by_user";
  }
  return source;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callModelWithRetry = async (prompt) => {
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash"];

  let lastError = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        return JSON.parse(response.text);
      } catch (error) {
        lastError = error;
        const isRetryable = error?.status === 429 || error?.status === 503;
        if (!isRetryable) break;
        if (attempt < 3) {
          await sleep(500 * 2 ** (attempt - 1));
        }
      }
    }
  }

  throw lastError;
};

// Creating a new case
app.post("/api/cases", async (req, res) => {
    try {
      const { original_note } = req.body;
  
      if (!original_note) {
        return res.status(400).json({ error: "original_note is required" });
      }
  
      const { data, error } = await supabase
        .from("clinical_cases")
        .insert([{ original_note, user_edited_data: null }])
        .select()
        .single();
  
      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ error: "Failed to create case" });
    }
});

// Helper function to extract definitive facts using Regex (Rule-Based Approach)
function extractDefinitiveFacts(text) {
  const facts = {};

  // Get chief complaint context
  const ccMatch = text.match(/(?:CHIEF COMPLAINT|Chief Complaint)\s*(?::|-)?\s*(.+?)(?=\n|$)/i);
  if (ccMatch) facts.chiefComplaint = ccMatch[1].trim();

  // Get age & gender context
  const demographicMatch = text.match(/(?:^|\b)(\d{1,3})(?:-?year-?old|-yo|\s*yo|\s*y\.o\.)?\s*(male|female|m|f)\b/i);
  if (demographicMatch) {
    facts.age = demographicMatch[1];
    facts.gender = demographicMatch[2].toLowerCase().startsWith('m') ? 'Male' : 'Female';
  }

  // Get disposition context
  const dispositionMatch = text.match(/(?:DISPOSITION|Admit to|Plan)\s*(?::|-)?\s*(.+?)(?=\n|$)/i);
  if (dispositionMatch) facts.explicitDisposition = dispositionMatch[1].trim();

  // Get allergies context
  const allergyMatch = text.match(/(?:ALLERGIES)\s*(?::|-)?\s*([^\n]+)/i);
  if (allergyMatch) facts.allergies = allergyMatch[1].trim();

  // Get past medical history context
  const pmhMatch = text.match(/(?:PAST MEDICAL HISTORY|PMH)\s*(?::|-)?\s*([^\n]+)/i);
  if (pmhMatch) facts.pastMedicalHistory = pmhMatch[1].trim();

  // Get medications context
  const medsMatch = text.match(/(?:CURRENT MEDICATIONS|HOME MEDICATIONS|MEDICATIONS)\s*(?::|-)?\s*([^\n]+)/i);
  if (medsMatch) facts.medications = medsMatch[1].trim();

  return facts;
}

const buildGenerationPrompt = (originalNote) => {
  // Rule based extraction
  const extractedFacts = extractDefinitiveFacts(originalNote);

  // Format rule based context
  let definitiveContext = "";
  if (Object.keys(extractedFacts).length > 0) {
    definitiveContext = `\n=== DEFINITIVE EXTRACTED FACTS ===\nI have already verified the following facts using a rule-based system. You MUST use these as absolute truth in your JSON output. Do not alter them:\n`;
    if (extractedFacts.chiefComplaint) definitiveContext += `- Chief Complaint: ${extractedFacts.chiefComplaint}\n`;
    if (extractedFacts.age && extractedFacts.gender) definitiveContext += `- Demographics: ${extractedFacts.age} year-old ${extractedFacts.gender}\n`;
    if (extractedFacts.explicitDisposition) definitiveContext += `- Explicit Disposition Found: ${extractedFacts.explicitDisposition}\n`;
    if (extractedFacts.allergies) definitiveContext += `- Allergies: ${extractedFacts.allergies}\n`;
    if (extractedFacts.pastMedicalHistory) definitiveContext += `- Past Medical History: ${extractedFacts.pastMedicalHistory}\n`;
    if (extractedFacts.medications) definitiveContext += `- Medications: ${extractedFacts.medications}\n`;
  }

  return `You are an expert clinical documentation specialist. 
    Your task is to convert unstructured clinical notes into a structured JSON format.
    
    CRITICAL HEALTHCARE GUARDRAILS:
    1. DO NOT INVENT, INFER, OR HALLUCINATE ANY DATA. 
    2. If a required piece of information is missing from the text, explicitly state "Not documented" in the relevant JSON field and list it under "uncertainties". Make the missing fields uniform in response, by listing "N/A".
    3. Also fill "Key findings" and "Suspected Condition(s)" with "N/A" if applicable.
    4. For "Uncertainties / Missing Information (if any)" list them in bullet points using "- " and "\n".
    5. You must rely ONLY on the provided unstructured text and the Definitive Extracted Facts below.
    ${definitiveContext}
    
    === EXAMPLE INPUT (Case A) ===
    ER NOTE:
    47-year-old male with recent diagnosis of diabetes, on Jardiance metformin, presents ED for 1 day history of inability to take deep breaths, sleep well, nausea, and vomiting. Patient is tachycardic. Kussmaul breathing. Lab Results: KETONES LARGE, ApH 7.200, AHCO3 7.4, CO2 <7, GLUCOSE 93. Clinical Impression: Euglycemic DKA.
    
    H&P NOTE:
    Assessment/Plan: euglycemic DKA secondary to Jardiance use. ICU admission. Insulin infusion.
    
    === EXAMPLE DESIRED JSON OUTPUT ===
    {
      "chiefComplaint": "Diabetes issue",
      "hpiSummary": "A 47-year-old man with a recent diagnosis of diabetes who had started metformin and Jardiance presented to the emergency department after one day of nausea, vomiting, inability to sleep, and difficulty taking deep breaths.",
      "keyFindings": [
        "Tachycardic and exhibiting Kussmaul breathing",
        "Large serum and urine ketones",
        "Severe metabolic acidosis (arterial pH 7.20, bicarbonate 7.4 mmol/L, serum CO2 <7 mmol/L)",
        "Serum glucose remained in the normal range (93 mg/dL)"
      ],
      "suspectedConditions": [
        "Euglycemic diabetic ketoacidosis in the setting of recent Jardiance use"
      ],
      "dispositionRecommendation": "Admit",
      "uncertainties": "None noted in the current documentation.",
      "revisedHpi": "A 47-year-old man with a recent diagnosis of diabetes who had started metformin and Jardiance presented to the emergency department after one day of nausea, vomiting, inability to sleep, and difficulty taking deep breaths. In the emergency department, he was described as tachycardic and exhibiting Kussmaul breathing. Laboratory evaluation demonstrated large serum and urine ketones with severe metabolic acidosis, including arterial pH 7.20, bicarbonate 7.4 millimoles per liter, and serum carbon dioxide less than 7 millimoles per liter, while serum glucose remained in the normal range. Emergency physicians documented euglycemic diabetic ketoacidosis in the setting of recent Jardiance use. In the emergency department he received bicarbonate, three liters of normal saline, and was started on an insulin infusion after repeated reassessments. Taken together, the documented severe acidosis with ketosis, escalation of emergency department treatment to continuous intravenous therapy, critical care involvement, and planned intensive care unit-level management supported the decision for inpatient admission rather than discharge or observation."
    }
    
    === REAL TASK ===
    Extract the information from the following unstructured clinical notes into a strict JSON object with the exact same keys as the example. Ensure the revisedHpi logically supports the disposition recommendation based on standard MCG guidelines.
    
    Unstructured Notes:
    ${originalNote}`;
};

const generateAndPersistForCase = async (id, originalNote) => {
  const prompt = buildGenerationPrompt(originalNote);
  const aiOutput = await callModelWithRetry(prompt);

  const { data: updatedCase, error: updateError } = await supabase
    .from("clinical_cases")
    .update({
      ai_generated_data: aiOutput,
      field_source: Object.fromEntries(TRACKED_FIELDS.map((field) => [field, "ai_generated"])),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) throw updateError;
  return updatedCase;
};

const parseDocumentToText = async (file) => {
  const name = file.originalname?.toLowerCase() ?? "";
  const mime = file.mimetype?.toLowerCase() ?? "";

  const isPdf = mime.includes("pdf") || name.endsWith(".pdf");
  const isDocx =
    mime.includes("wordprocessingml.document") ||
    name.endsWith(".docx");

  if (isPdf) {
    const parsed = await pdfParse(file.buffer);
    return parsed.text?.trim() ?? "";
  }

  if (isDocx) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return parsed.value?.trim() ?? "";
  }

  const error = new Error("Unsupported file type. Please upload a PDF or DOCX file.");
  error.status = 400;
  throw error;
};

// Generating structured output and Revised HPI
app.post("/api/cases/:id/generate", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: caseRecord, error: fetchError } = await supabase
      .from("clinical_cases")
      .select("original_note")
      .eq("id", id)
      .single();

    if (fetchError || !caseRecord) {
      return res.status(404).json({ error: "Case not found" });
    }

    const updatedCase = await generateAndPersistForCase(id, caseRecord.original_note);

    res.status(200).json(updatedCase);
  } catch (error) {
    console.error("Error generating AI data:", error);
    const status = error?.status ?? 500;
    const code = error?.code ?? error?.status ?? "UNKNOWN_ERROR";
    res.status(status).json({
      error: "Failed to generate analysis",
      code,
    });
  }
});

app.post("/api/cases/upload", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "document file is required" });
    }

    const extractedText = await parseDocumentToText(req.file);
    if (!extractedText) {
      return res.status(400).json({ error: "No readable text found in uploaded document." });
    }

    const { data: createdCase, error: createError } = await supabase
      .from("clinical_cases")
      .insert([{ original_note: extractedText, user_edited_data: null }])
      .select()
      .single();

    if (createError || !createdCase) {
      throw createError ?? new Error("Failed to create case from upload");
    }

    const updatedCase = await generateAndPersistForCase(createdCase.id, extractedText);
    res.status(200).json(updatedCase);
  } catch (error) {
    console.error("Error processing uploaded document:", error);
    const status = error?.status ?? 500;
    const code = error?.code ?? error?.status ?? "UPLOAD_GENERATE_ERROR";
    res.status(status).json({
      error: error?.message || "Failed to process uploaded document",
      code,
    });
  }
});

// Saving edited structured output
app.patch("/api/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_edited_data } = req.body;

    if (!user_edited_data) {
      return res.status(400).json({ error: "user_edited_data is required" });
    }

    const { data: existingCase, error: fetchError } = await supabase
      .from("clinical_cases")
      .select("ai_generated_data")
      .eq("id", id)
      .single();

    if (fetchError || !existingCase) {
      return res.status(404).json({ error: "Case not found" });
    }

    const fieldSource = buildFieldSource({
      aiData: existingCase.ai_generated_data ?? {},
      userData: user_edited_data,
    });

    const { data, error } = await supabase
      .from("clinical_cases")
      .update({ user_edited_data, field_source: fieldSource })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error updating case:", error);
    res.status(500).json({ error: "Failed to update case" });
  }
});

//  Listing saved cases
app.get("/api/cases", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("clinical_cases")
      .select("id, created_at, original_note, ai_generated_data, user_edited_data, field_source")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching cases:", error);
    res.status(500).json({ error: "Failed to fetch cases" });
  }
});

// Retrieving a case by ID
app.get("/api/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("clinical_cases")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Case not found" });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching case:", error);
    res.status(500).json({ error: "Failed to fetch case" });
  }
});

// Delete case by ID
app.delete("/api/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("clinical_cases")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Case not found" });

    res.status(200).json({ id: data.id, deleted: true });
  } catch (error) {
    console.error("Error deleting case:", error);
    res.status(500).json({ error: "Failed to delete case" });
  }
});


app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
