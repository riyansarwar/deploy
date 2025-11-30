import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StudentResult {
  studentQuizId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  score: number | null;
  status: string;
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
  question: {
    id: number;
    content: string;
    type: string;
  };
}

export default function QuizResultsSummaryPage() {
  const { quizId } = useParams();
  const [, setLocation] = useLocation();
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);

  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ["/api/quizzes", quizId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/quizzes/${quizId}`);
      return response.json();
    },
    enabled: !!quizId
  });

  const { data: resultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/quizzes", quizId, "results-summary"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/quizzes/${quizId}/results-summary`);
      return response.json();
    },
    enabled: !!quizId
  });

  const { data: studentDetails } = useQuery({
    queryKey: ["/api/student-quizzes", expandedStudentId, "results"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/student-quizzes/${expandedStudentId}/results`);
      return response.json();
    },
    enabled: !!expandedStudentId
  });

  const getGradeLetter = (score: number | null) => {
    if (score === null) return "N/A";
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

  if (quizLoading || resultsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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
          <p className="text-muted-foreground">{quizData?.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Results Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...resultsData || []].sort((a: StudentResult, b: StudentResult) => (b.score ?? -1) - (a.score ?? -1)).map((student: StudentResult) => (
              <div key={student.studentQuizId} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                  onClick={() =>
                    setExpandedStudentId(
                      expandedStudentId === student.studentQuizId ? null : student.studentQuizId
                    )
                  }
                >
                  <div className="flex items-center gap-4 flex-1">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{student.studentName}</p>
                      <p className="text-sm text-gray-600">{student.studentEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getGradeColor(student.score)}>
                      {student.score !== null ? `${student.score}% (${getGradeLetter(student.score)})` : "Not Graded"}
                    </Badge>
                    {expandedStudentId === student.studentQuizId ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>

                {expandedStudentId === student.studentQuizId && studentDetails && (
                  <div className="p-4 border-t space-y-4">
                    <div>
                      <h4 className="font-medium mb-3">Detailed Answers</h4>
                      <div className="space-y-3">
                        {studentDetails?.answers?.map((answer: Answer, idx: number) => {
                          const isUnanswered = !answer.answer && !answer.codeAnswer;
                          return (
                            <div key={`${answer.questionId}-${idx}`} className="border rounded-lg p-3 bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h5 className="font-medium text-sm">Question {idx + 1}: {answer.question.content}</h5>
                                  <p className="text-xs text-gray-600 mt-1">{answer.question.type}</p>
                                </div>
                                {answer.score !== null && (
                                  <Badge className={getGradeColor(answer.score)}>
                                    {getGradeLetter(answer.score)}
                                  </Badge>
                                )}
                              </div>
                              {isUnanswered ? (
                                <p className="text-xs text-red-600 italic">Not answered</p>
                              ) : (
                                <>
                                  {answer.answer && (
                                    <div className="text-xs bg-white p-2 rounded border-l-2 border-blue-300 mt-2">
                                      <p className="font-medium text-gray-700 mb-1">Answer:</p>
                                      <p className="text-gray-600 whitespace-pre-wrap line-clamp-3">{answer.answer}</p>
                                    </div>
                                  )}
                                  {answer.codeAnswer && (
                                    <div className="text-xs bg-white p-2 rounded border-l-2 border-green-300 mt-2">
                                      <p className="font-medium text-gray-700 mb-1">Code:</p>
                                      <pre className="text-gray-600 overflow-auto max-h-32 text-xs">{answer.codeAnswer}</pre>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
