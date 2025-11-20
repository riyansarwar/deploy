import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { CheckIcon, AlertCircle, BookOpen, Loader2, BarChart2, FileText, Code } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ProfessionalCppIde } from "@/components/ui/professional-cpp-ide";
import { Link } from "wouter";

const PRACTICE_QUIZ_STORAGE_KEY = "practice_quiz_session";
const PRACTICE_QUIZ_STATE_KEY = "practice_quiz_state";

export default function PracticeQuizPage() {
  const { toast } = useToast();
  const [selectedChapter, setSelectedChapter] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<number, string>>({});
  const [showCodeEditor, setShowCodeEditor] = useState<Record<number, boolean>>({});

  const [currentTab, setCurrentTab] = useState("select");
  const [practiceSession, setPracticeSession] = useState<any>(null);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [hasResumeOption, setHasResumeOption] = useState(false);

  // Get practice quiz history
  const { data: practiceQuizHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/practice-quiz/history"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/practice-quiz/history");
        return await res.json();
      } catch (error) {
        console.error("Error fetching practice quiz history:", error);
        throw error;
      }
    },
    retry: 1,
  });

  // Fetch chapters for OOP (the only subject with chapters)
  const { data: chaptersData, isLoading: isLoadingChapters } = useQuery({
    queryKey: ["/api/practice-quiz/chapters"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/practice-quiz/chapters?subject=${encodeURIComponent("Object-Oriented Programming")}`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching chapters:", error);
        throw error;
      }
    },
    retry: 1,
  });

  // Load saved session from localStorage on component mount
  useEffect(() => {
    const savedSession = localStorage.getItem(PRACTICE_QUIZ_STORAGE_KEY);
    const savedState = localStorage.getItem(PRACTICE_QUIZ_STATE_KEY);
    
    if (savedSession && savedState) {
      try {
        const session = JSON.parse(savedSession);
        const state = JSON.parse(savedState);
        setHasResumeOption(true);
      } catch (error) {
        console.error("Error loading saved session:", error);
        localStorage.removeItem(PRACTICE_QUIZ_STORAGE_KEY);
        localStorage.removeItem(PRACTICE_QUIZ_STATE_KEY);
      }
    }
  }, []);

  // Save quiz session to localStorage whenever it changes
  useEffect(() => {
    if (practiceSession) {
      localStorage.setItem(PRACTICE_QUIZ_STORAGE_KEY, JSON.stringify(practiceSession));
    }
  }, [practiceSession]);

  // Save quiz state to localStorage whenever it changes
  useEffect(() => {
    if (practiceSession && (Object.keys(answers).length > 0 || Object.keys(codeAnswers).length > 0)) {
      const state = {
        currentQuestionIndex,
        answers,
        codeAnswers,
        showCodeEditor,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(PRACTICE_QUIZ_STATE_KEY, JSON.stringify(state));
    }
  }, [currentQuestionIndex, answers, codeAnswers, showCodeEditor, practiceSession]);

  // Generate practice quiz mutation
  const generateQuizMutation = useMutation({
    mutationFn: async (data: { chapter?: string; questionCount: number }) => {
      // Always use OOP as the subject
      const requestData = {
        subject: "Object-Oriented Programming",
        chapter: data.chapter,
        questionCount: data.questionCount
      };
      const res = await apiRequest("POST", "/api/practice-quiz/generate", requestData);
      return await res.json();
    },
    onSuccess: (data) => {
      setPracticeSession(data.practiceQuiz);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setCodeAnswers({});
      setShowCodeEditor({});
      setCurrentTab("quiz");
      
      // Invalidate the history query to refresh it
      queryClient.invalidateQueries({ queryKey: ["/api/practice-quiz/history"] });
      
      toast({
        title: "Practice Quiz Ready",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate practice quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit practice quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async (data: { answers: any[]; practiceQuizId: number }) => {
      const res = await apiRequest("POST", "/api/practice-quiz/submit", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setQuizResults(data);
      setCurrentTab("results");
      
      localStorage.removeItem(PRACTICE_QUIZ_STORAGE_KEY);
      localStorage.removeItem(PRACTICE_QUIZ_STATE_KEY);
      
      // Invalidate the history query to refresh it
      queryClient.invalidateQueries({ queryKey: ["/api/practice-quiz/history"] });
      
      // Also invalidate notifications
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      
      toast({
        title: "Practice Quiz Graded",
        description: `Your score: ${data.averageScore}%`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit practice quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle starting a new practice quiz
  const handleStartPractice = () => {
    if (!selectedChapter) {
      toast({
        title: "Chapter Required",
        description: "Please select a chapter for your practice quiz",
        variant: "destructive",
      });
      return;
    }

    generateQuizMutation.mutate({
      chapter: selectedChapter,
      questionCount: parseInt(questionCount),
    });
  };

  // Navigation helpers
  const handleNextQuestion = () => {
    if (currentQuestionIndex < practiceSession.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };



  // Submit the quiz for grading
  const handleSubmitQuiz = () => {
    // Check if all questions are answered
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = practiceSession.questions.length;
    
    if (answeredCount < totalQuestions) {
      if (!confirm(`You've only answered ${answeredCount} out of ${totalQuestions} questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    // Format answers for submission including both text and code answers
    const formattedAnswers = practiceSession.questions.map((question: any) => ({
      questionId: question.id,
      answer: answers[question.id] || "",
      codeAnswer: codeAnswers[question.id] || "",
      editorType: showCodeEditor[question.id] ? "code" : "text"
    }));

    submitQuizMutation.mutate({
      answers: formattedAnswers,
      practiceQuizId: practiceSession.id,
    });
  };

  // Resume practice quiz from localStorage
  const handleResumePractice = () => {
    const savedSession = localStorage.getItem(PRACTICE_QUIZ_STORAGE_KEY);
    const savedState = localStorage.getItem(PRACTICE_QUIZ_STATE_KEY);
    
    if (savedSession && savedState) {
      try {
        const session = JSON.parse(savedSession);
        const state = JSON.parse(savedState);
        
        setPracticeSession(session);
        setCurrentQuestionIndex(state.currentQuestionIndex);
        setAnswers(state.answers);
        setCodeAnswers(state.codeAnswers);
        setShowCodeEditor(state.showCodeEditor);
        setCurrentTab("quiz");
        
        toast({
          title: "Practice Quiz Resumed",
          description: "Your previous session has been restored.",
        });
      } catch (error) {
        console.error("Error resuming practice quiz:", error);
        toast({
          title: "Error",
          description: "Failed to resume practice quiz",
          variant: "destructive",
        });
      }
    }
  };

  // Start a new practice quiz
  const handleNewPractice = () => {
    setCurrentTab("select");
    setPracticeSession(null);
    setQuizResults(null);
    setAnswers({});
    setCodeAnswers({});
    setShowCodeEditor({});
    setHasResumeOption(false);
    localStorage.removeItem(PRACTICE_QUIZ_STORAGE_KEY);
    localStorage.removeItem(PRACTICE_QUIZ_STATE_KEY);
  };

  // Handle text answer changes
  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Handle code answer changes
  const handleCodeChange = (questionId: number, code: string) => {
    setCodeAnswers(prev => ({ ...prev, [questionId]: code }));
  };





  // Calculate completion percentage
  const getCompletionPercentage = () => {
    if (!practiceSession) return 0;
    return (Object.keys(answers).length / practiceSession.questions.length) * 100;
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-cyan-600 to-cyan-500 bg-clip-text text-transparent">Practice Quiz</h1>
          <p className="text-center text-cyan-700 mt-2">Improve your skills with AI-powered practice quizzes</p>
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-md border border-cyan-200">
            <TabsTrigger 
              value="select" 
              disabled={currentTab === "quiz" || currentTab === "results"}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              Select Chapter
            </TabsTrigger>
            <TabsTrigger 
              value="quiz" 
              disabled={!practiceSession || currentTab === "results"}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              Take Quiz
            </TabsTrigger>
            <TabsTrigger 
              value="results" 
              disabled={!quizResults}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
            >
              Results
            </TabsTrigger>
          </TabsList>
        
          {/* Chapter Selection Tab */}
          <TabsContent value="select">
            <div className="space-y-6 max-w-3xl mx-auto">
              {hasResumeOption && (
                <Card className="border-amber-300 shadow-xl bg-amber-50/90 backdrop-blur-sm hover-lift">
                  <CardHeader className="bg-gradient-to-br from-amber-50 via-white to-amber-50 border-b border-amber-200">
                    <CardTitle className="text-xl font-bold text-amber-900 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-amber-600" />
                      Resume Previous Practice Quiz?
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                      You have an unfinished practice quiz. Click below to continue where you left off.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="px-6 py-4 gap-2">
                    <Button 
                      onClick={handleResumePractice}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold"
                    >
                      Resume Practice Quiz
                    </Button>
                    <Button 
                      onClick={handleNewPractice}
                      variant="outline"
                      className="border-amber-300 hover:bg-amber-50"
                    >
                      Start New Quiz
                    </Button>
                  </CardFooter>
                </Card>
              )}
              <Card className="border-cyan-200 shadow-xl bg-white/90 backdrop-blur-sm hover-lift">
                <CardHeader className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50 border-b border-cyan-100">
                  <CardTitle className="text-2xl font-bold text-cyan-900 flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-cyan-600" />
                    Create Practice Quiz
                  </CardTitle>
                  <CardDescription className="text-cyan-700">
                    Select a chapter and the number of questions for your practice quiz.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-3">
                    <Label htmlFor="chapter" className="text-sm font-semibold text-cyan-900">Chapter</Label>
                    <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                      <SelectTrigger id="chapter" className="bg-cyan-50 border-cyan-300 hover:bg-cyan-100 hover:border-cyan-400 transition-all duration-200 h-12 text-base shadow-sm">
                        <SelectValue placeholder="Select a chapter" />
                      </SelectTrigger>
                    <SelectContent>
                      {isLoadingChapters ? (
                        <SelectItem value="loading" disabled>
                          Loading chapters...
                        </SelectItem>
                      ) : (
                        chaptersData?.chapters?.map((chapter: string) => (
                          <SelectItem key={chapter} value={chapter}>
                            {chapter} ({chaptersData.chapterCounts.find((cc: any) => cc.chapter === chapter)?.count || 0} questions)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                  <div className="space-y-3">
                    <Label htmlFor="questionCount" className="text-sm font-semibold text-cyan-900">Number of Questions</Label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger id="questionCount" className="bg-cyan-50 border-cyan-300 hover:bg-cyan-100 hover:border-cyan-400 transition-all duration-200 h-12 text-base shadow-sm">
                        <SelectValue placeholder="5 questions" />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 questions</SelectItem>
                      <SelectItem value="5">5 questions</SelectItem>
                      <SelectItem value="10">10 questions</SelectItem>
                      <SelectItem value="15">15 questions</SelectItem>
                      <SelectItem value="20">20 questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
                <CardFooter className="px-6 pb-6 pt-4">
                  <Button 
                    onClick={handleStartPractice} 
                    disabled={!selectedChapter || generateQuizMutation.isPending}
                    className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-base"
                  >
                    {generateQuizMutation.isPending ? "Generating..." : "Start Practice Quiz"}
                  </Button>
                </CardFooter>
              </Card>
            
              {/* Practice Quiz History */}
              <Card className="border-cyan-200 shadow-xl bg-white/90 backdrop-blur-sm hover-lift">
                <CardHeader className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50 border-b border-cyan-100">
                  <CardTitle className="text-2xl font-bold text-cyan-900 flex items-center gap-2">
                    <BarChart2 className="h-6 w-6 text-cyan-600" />
                    Your Practice Quiz History
                  </CardTitle>
                  <CardDescription className="text-cyan-700">
                    Review your previous practice quizzes and scores.
                  </CardDescription>
                </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : practiceQuizHistory?.practiceQuizzes?.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>You haven't taken any practice quizzes yet.</p>
                    <p className="text-sm mt-1">
                      Start your first one above to see your performance history.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chapter</TableHead>
                            <TableHead>Questions</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {practiceQuizHistory?.practiceQuizzes?.map((quiz: any) => (
                            <TableRow key={quiz.id}>
                              <TableCell className="font-medium">{quiz.chapter}</TableCell>
                              <TableCell>{quiz.questionCount}</TableCell>
                              <TableCell>
                                <Badge variant={quiz.status === 'completed' ? 'secondary' : 'default'}>
                                  {quiz.status === 'completed' ? 'Completed' : 'In Progress'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {quiz.score !== null ? `${quiz.score}%` : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {new Date(quiz.createdAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
          {/* Quiz Taking Tab */}
          <TabsContent value="quiz">
            {practiceSession && (
              <div className="space-y-6">
                <Card className="border-cyan-200 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50 border-b border-cyan-100">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-2xl font-bold text-cyan-900">
                        Practice Quiz: {practiceSession.subject}
                      </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {currentQuestionIndex + 1} of {practiceSession.questions.length}
                    </div>
                  </div>
                  <CardDescription>
                    Answer each question to the best of your ability.
                  </CardDescription>
                  <Progress value={getCompletionPercentage()} className="h-2" />
                </CardHeader>
                <CardContent className="space-y-8">
                  {practiceSession.questions[currentQuestionIndex] && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <BookOpen className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                          <div>
                            <h3 className="font-medium text-lg">
                              Question {currentQuestionIndex + 1}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {practiceSession.questions[currentQuestionIndex].type} · {practiceSession.questions[currentQuestionIndex].subject} · {practiceSession.questions[currentQuestionIndex].difficulty}
                            </p>
                            <div className="text-base">
                              {practiceSession.questions[currentQuestionIndex].content}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Universal Answer Input with Code Editor for ALL Practice Questions */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {practiceSession.questions[currentQuestionIndex].type === "coding" ? "Your Solution:" : "Your Answer:"}
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              variant={!showCodeEditor[practiceSession.questions[currentQuestionIndex].id] ? "default" : "outline"}
                              size="sm"
                              onClick={() => setShowCodeEditor(prev => ({ 
                                ...prev, 
                                [practiceSession.questions[currentQuestionIndex].id]: false 
                              }))}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Text Editor
                            </Button>
                            <Button
                              variant={showCodeEditor[practiceSession.questions[currentQuestionIndex].id] ? "default" : "outline"}
                              size="sm"
                              onClick={() => setShowCodeEditor(prev => ({ 
                                ...prev, 
                                [practiceSession.questions[currentQuestionIndex].id]: true 
                              }))}
                            >
                              <Code className="h-4 w-4 mr-2" />
                              Code Editor
                            </Button>
                          </div>
                        </div>
                        
                        {/* Editor content - Available for ALL question types */}
                        <div>
                          {showCodeEditor[practiceSession.questions[currentQuestionIndex].id] ? (
                            <div className="space-y-3">
                              <ProfessionalCppIde
                                initialCode={codeAnswers[practiceSession.questions[currentQuestionIndex].id] || (
                                  practiceSession.questions[currentQuestionIndex].type === "coding"
                                    ? "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello, World!\" << endl;\n    return 0;\n}"
                                    : "// You can write code snippets, algorithms, or pseudocode here\n// This is helpful for technical questions\n\n"
                                )}
                                onCodeChange={(code) => handleCodeChange(practiceSession.questions[currentQuestionIndex].id, code)}
                                height="500px"
                                showTemplates={true}
                                enableFormatting={true}
                                enableAnalysis={true}
                              />
                            </div>
                          ) : (
                            <Textarea
                              value={answers[practiceSession.questions[currentQuestionIndex].id] || ""}
                              onChange={(e) => handleAnswerChange(
                                practiceSession.questions[currentQuestionIndex].id,
                                e.target.value
                              )}
                              placeholder={
                                practiceSession.questions[currentQuestionIndex].type === "coding" 
                                  ? "Type your answer here (algorithm explanation, pseudocode, or approach)..."
                                  : "Type your answer here..."
                              }
                              className="min-h-[200px] font-mono"
                            />
                          )}
                        </div>
                        
                        {/* Additional explanation field when using code editor */}
                        {showCodeEditor[practiceSession.questions[currentQuestionIndex].id] && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">
                              {practiceSession.questions[currentQuestionIndex].type === "coding" ? "Explanation (optional):" : "Text Explanation:"}
                            </Label>
                            <Textarea
                              value={answers[practiceSession.questions[currentQuestionIndex].id] || ""}
                              onChange={(e) => handleAnswerChange(
                                practiceSession.questions[currentQuestionIndex].id,
                                e.target.value
                              )}
                              placeholder={
                                practiceSession.questions[currentQuestionIndex].type === "coding"
                                  ? "Explain your approach, algorithm, or any assumptions..."
                                  : "Provide additional text explanation for your code solution..."
                              }
                              className="min-h-[100px]"
                            />
                          </div>
                        )}
                        
                        {/* Help text for practice quiz */}
                        <div className="text-xs text-muted-foreground bg-green-50 p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                            <div>
                              <strong>Practice Mode:</strong> Use any editor type to practice and improve your skills
                            </div>
                          </div>
                          <div className="flex items-start gap-2 mt-1">
                            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                            <div>
                              <strong>AI Feedback:</strong> You'll receive detailed feedback on both text and code answers
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div>
                    <Button
                      variant="outline"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {currentQuestionIndex < practiceSession.questions.length - 1 ? (
                      <Button onClick={handleNextQuestion}>
                        Next
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSubmitQuiz}
                        disabled={submitQuizMutation.isPending}
                      >
                        {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
              
              <div className="flex justify-center gap-2 flex-wrap mt-4">
                {practiceSession.questions.map((q: any, index: number) => (
                  <Button
                    key={q.id}
                    variant={index === currentQuestionIndex ? "default" : answers[q.id] ? "outline" : "secondary"}
                    className="w-10 h-10 p-0 rounded-full"
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        
          {/* Results Tab */}
          <TabsContent value="results">
            {quizResults && (
              <div className="space-y-6">
                <Card className="border-cyan-200 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50 border-b border-cyan-100">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-2xl font-bold text-cyan-900">Quiz Results</CardTitle>
                    <div className="text-2xl font-bold">
                      Score: {quizResults.averageScore}%
                    </div>
                  </div>
                  <CardDescription>
                    Review your results and feedback for each question.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {quizResults.results.map((result: any, index: number) => (
                      <div key={result.questionId} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-full p-1 ${result.score >= 70 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {result.score >= 70 ? (
                              <CheckIcon className="h-5 w-5" />
                            ) : (
                              <AlertCircle className="h-5 w-5" />
                            )}
                          </div>
                          <div className="space-y-2 flex-1">
                            <h3 className="font-medium text-lg">
                              Question {index + 1} <span className="text-muted-foreground text-sm font-normal">(Score: {result.score}%)</span>
                            </h3>
                            <p className="text-base">{result.question}</p>
                            
                            <div className="bg-muted/50 p-3 rounded-md mt-2">
                              <h4 className="text-sm font-medium mb-1">Your Answer:</h4>
                              <p className="text-sm">{result.studentAnswer || "(No answer provided)"}</p>
                            </div>
                            
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-1">Grade:</h4>
                              <p className="text-sm font-semibold">{result.analysis?.letterGrade || 'F'}</p>
                            </div>

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button onClick={handleNewPractice}>Start New Practice Quiz</Button>
                  <Link href="/dashboard">
                    <Button variant="outline">Return to Dashboard</Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}