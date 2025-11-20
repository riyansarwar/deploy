import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, FileText, User, ArrowLeft, Loader2 } from "lucide-react";
import { ProfessionalCppIde } from "@/components/ui/professional-cpp-ide";

interface QuizResult {
  id: number;
  studentId: number;
  quizId: number;
  score: number | null;
  status: string;
  startedAt: string;
  completedAt: string;
}

interface Answer {
  id: number;
  questionId: number;
  answer: string;
  codeAnswer: string;
  codeOutput: string;
  codeError: string;
  score: number | null;
  feedback: string | null;
  aiAnalysis: any;
  question: {
    id: number;
    content: string;
    type: string;
    answer: string;
  };
}

interface Quiz {
  id: number;
  title: string;
  subject: string;
  status: string;
  resultsPosted: boolean;
}

export default function StudentResultsPage() {
  const { studentQuizId } = useParams();
  const [, setLocation] = useLocation();

  const { data: resultsData, isLoading } = useQuery({
    queryKey: ["/api/student-quizzes", studentQuizId, "results"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/student-quizzes/${studentQuizId}/results`);
      return response.json();
    },
    enabled: !!studentQuizId
  });

  const getGradeLetter = (score: number | null) => {
    if (score === null) return "Not Graded";
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };

  const getGradeColor = (score: number | null) => {
    if (score === null) return "bg-gray-100 text-gray-800";
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-blue-100 text-blue-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    if (score >= 60) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const calculateOverallScore = (answers: Answer[]) => {
    const gradedAnswers = answers.filter(a => a.score !== null);
    if (gradedAnswers.length === 0) return null;
    return Math.round(gradedAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAnswers.length);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const studentQuiz: QuizResult = resultsData?.studentQuiz;
  const quiz: Quiz = resultsData?.quiz;
  const answers: Answer[] = resultsData?.answers || [];
  const overallScore = calculateOverallScore(answers);
  const isFullyGraded = answers.every(a => a.score !== null);

  // Check if results are posted by teacher
  if (!quiz?.resultsPosted) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Quiz Results</h1>
            <p className="text-muted-foreground">{quiz?.title}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <div className="text-6xl">📊</div>
          <h2 className="text-2xl font-semibold text-gray-900">Results Not Posted Yet</h2>
          <p className="text-gray-600 max-w-md">
            The quiz results have not been posted by the teacher yet. Please check back later.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => setLocation("/quizzes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Quiz Results</h1>
          <p className="text-muted-foreground">{quiz?.title}</p>
        </div>
      </div>

      {/* Overall Score Card */}
      {isFullyGraded && (
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-900 mb-2">Overall Score</h3>
                <p className="text-muted-foreground">Your final grade for this quiz</p>
              </div>
              <div className="text-center">
                <div className={`text-6xl font-bold ${getGradeColor(overallScore)}`}>
                  {getGradeLetter(overallScore)}
                </div>
                <div className="text-2xl font-semibold mt-2">{overallScore}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grading Status */}
      {!isFullyGraded && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">
              ⏳ This quiz is still being graded by your teacher. Some results may not be available yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Answers */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {answers.map((answer: Answer, idx: number) => {
              const isUnanswered = !answer.answer && !answer.codeAnswer;

              return (
                <Card key={`${answer.questionId}-${idx}`} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">Question {idx + 1}: {answer.question.content}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">
                            {answer.question.type === "coding" ? (
                              <><Code className="h-3 w-3 mr-1" /> Coding</>
                            ) : (
                              <><FileText className="h-3 w-3 mr-1" /> Text</>
                            )}
                          </Badge>

                          {isUnanswered && <Badge variant="destructive">Not Answered</Badge>}

                          {answer.score !== null && (
                            <Badge className={getGradeColor(answer.score)}>
                              {getGradeLetter(answer.score)}
                            </Badge>
                          )}

                          {answer.score === null && !isUnanswered && (
                            <Badge variant="secondary">Pending Grade</Badge>
                          )}
                        </div>
                      </div>
                    </div>



                    {/* Student Answer */}
                    {isUnanswered ? (
                      <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-800 italic">You did not provide an answer to this question.</p>
                      </div>
                    ) : (
                      <>
                        {answer.answer && (
                          <div className="mb-4">
                            <h5 className="font-medium mb-2">Your Text Answer:</h5>
                            <div className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap border">
                              {answer.answer}
                            </div>
                          </div>
                        )}

                        {answer.codeAnswer && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium">Your Code:</h5>
                            </div>
                            <ProfessionalCppIde
                              initialCode={answer.codeAnswer}
                              readOnly={true}
                              height="300px"
                            />
                          </div>
                        )}
                      </>
                    )}


                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
