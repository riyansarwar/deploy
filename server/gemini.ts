import axios, { AxiosError } from "axios";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models";
const DEFAULT_SUBJECT = "Object-Oriented Programming with C++";

const GEMINI_BASE_PROMPT = `You are an AI grader for C++ programming assessments. Grade each question individually fairly and educationally.

For each question, check if the answer is empty or just whitespace:
- If EMPTY: Return grade "F"

For non-empty answers, evaluate based on correctness and understanding:
- A: Completely correct with good explanation (90-100%)
- B: Mostly correct with adequate explanation (80-89%)
- C: Basically correct but missing details (70-79%)
- D: Partially correct but has errors or is unclear (60-69%)
- F: Mostly incorrect or shows no understanding (0-59%)

Be generous with grading - reward effort and partial understanding. Technical questions should focus on conceptual accuracy over perfect wording.

Respond with deterministic JSON that exactly matches this shape:
{
  "submissionId": "<repeat the submission id provided>",
  "questionGrades": [
    {
      "questionId": <number>,
      "letterGrade": "<A|B|C|D|F>",
      "feedback": "<brief constructive feedback>"
    }
  ],
  "model": "gemini-2.0-flash-001"
}

Grade each question individually. The questionGrades array must contain one entry for each question in the submission. Do not include scores or additional fields beyond what's specified.`;

interface GeminiGradeRequestQuestion {
  questionId: number;
  prompt: string;
  correctAnswer: string;
  studentAnswer: string;
}

export interface GeminiGradeRequest {
  submissionId: string;
  quizType: "assigned" | "practice";
  studentId: number;
  quizId?: number;
  practiceQuizId?: number;
  subject?: string;
  questions: GeminiGradeRequestQuestion[];
  metadata?: Record<string, unknown>;
}

type GeminiLetterGrade = "A" | "B" | "C" | "D" | "F";

export interface GeminiQuestionGrade {
  questionId: number;
  letterGrade: GeminiLetterGrade;
  feedback: string;
}

export interface GeminiGradeResponse {
  submissionId: string;
  questionGrades: GeminiQuestionGrade[];
  model: string;
  latencyMs?: number;
  rawResponse?: unknown;
}

class GeminiClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor({ apiKey, model, timeoutMs = 30000 }: { apiKey?: string; model?: string; timeoutMs?: number }) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    this.apiKey = apiKey;
    this.model = model ?? "gemini-2.5-pro";
    this.timeoutMs = timeoutMs;
  }

  async grade(request: GeminiGradeRequest): Promise<GeminiGradeResponse> {
    const payload = this.buildPayload(request);
    const url = `${GEMINI_API_URL}/${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`;

    try {
      const start = Date.now();
      const response = await axios.post(url, payload, {
        timeout: this.timeoutMs,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const latencyMs = Date.now() - start;
      return this.transformResponse(request, response.data, latencyMs);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private buildPayload(request: GeminiGradeRequest) {
    const submissionBlock = this.formatSubmission(request);

    return {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: GEMINI_BASE_PROMPT,
            },
            {
              text: submissionBlock,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        topP: 0.8,
      },
    };
  }

  private formatSubmission(request: GeminiGradeRequest): string {
    const subject = request.subject ?? DEFAULT_SUBJECT;

    const headerLines = [
      `SUBMISSION_ID: ${request.submissionId}`,
      `QUIZ_TYPE: ${request.quizType}`,
      `SUBJECT: ${subject}`,
      `STUDENT_ID: ${request.studentId}`,
    ];

    if (request.quizId) {
      headerLines.push(`QUIZ_ID: ${request.quizId}`);
    }

    if (request.practiceQuizId) {
      headerLines.push(`PRACTICE_QUIZ_ID: ${request.practiceQuizId}`);
    }

    const questionBlocks = request.questions
      .map((question) => {
        return [
          `QUESTION_ID: ${question.questionId}`,
          `PROMPT:\n${question.prompt}`,
          `CORRECT_ANSWER:\n${question.correctAnswer}`,
          `STUDENT_ANSWER:\n${question.studentAnswer}`,
        ].join("\n\n");
      })
      .join("\n\n---\n\n");

    const metadataBlock = request.metadata
      ? `\n\nMETADATA (JSON):\n${JSON.stringify(request.metadata, null, 2)}`
      : "";

    return [headerLines.join("\n"), "\nQUESTIONS:\n", questionBlocks, metadataBlock].join("");
  }

  private transformResponse(request: GeminiGradeRequest, data: any, latencyMs: number): GeminiGradeResponse {
    // Extract JSON from Gemini response
    let parsedData: any = {};
    try {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        // Remove markdown code blocks if present
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        parsedData = JSON.parse(cleanText);
      }
    } catch (error) {
      console.error('Failed to parse Gemini response JSON:', error);
      console.error('Raw response:', data);
    }

    // Normalize question grades
    const questionGrades = this.normalizeQuestionGrades(parsedData?.questionGrades, request.questions);

    return {
      submissionId: typeof parsedData?.submissionId === "string" ? parsedData.submissionId : request.submissionId,
      questionGrades,
      model: typeof parsedData?.model === "string" ? parsedData.model : this.model,
      latencyMs,
      rawResponse: data,
    };
  }

  private normalizeQuestionGrades(questionGrades: unknown, requestQuestions: GeminiGradeRequestQuestion[]): GeminiQuestionGrade[] {
    if (!Array.isArray(questionGrades)) {
      // Fallback: give F grade to all questions
      return requestQuestions.map(q => ({
        questionId: q.questionId,
        letterGrade: "F" as GeminiLetterGrade,
        feedback: "Grading failed - please contact instructor"
      }));
    }

    return requestQuestions.map(requestQuestion => {
      const grade = questionGrades.find((g: any) => g?.questionId === requestQuestion.questionId);
      if (!grade) {
        return {
          questionId: requestQuestion.questionId,
          letterGrade: "F" as GeminiLetterGrade,
          feedback: "Question not graded"
        };
      }

      return {
        questionId: requestQuestion.questionId,
        letterGrade: this.normalizeLetterGrade(grade.letterGrade),
        feedback: typeof grade.feedback === "string" ? grade.feedback : "No feedback provided"
      };
    });
  }

  private normalizeLetterGrade(letter: unknown): GeminiLetterGrade {
    if (letter === "A" || letter === "B" || letter === "C" || letter === "D" || letter === "F") {
      return letter;
    }
    return "F";
  }

  private normalizeError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const data = axiosError.response?.data as any;
      const message = data?.error?.message ?? axiosError.message;
      const status = axiosError.response?.status;
      return new Error(`Gemini API error${status ? ` (${status})` : ""}: ${message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error("Unknown error when calling Gemini");
  }
}

let singleton: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!singleton) {
    singleton = new GeminiClient({
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
      timeoutMs: process.env.GEMINI_TIMEOUT_MS ? Number(process.env.GEMINI_TIMEOUT_MS) : undefined,
    });
  }
  return singleton;
}

export async function gradeWithGemini(request: GeminiGradeRequest): Promise<GeminiGradeResponse> {
  const client = getGeminiClient();
  return client.grade(request);
}