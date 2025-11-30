import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Validating your verification link...");

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const accessToken = hashParams.get("access_token");
    const token = queryParams.get("token") || queryParams.get("token_hash");
    const type = hashParams.get("type") || queryParams.get("type") || "signup";

    if (!accessToken && !token) {
      setStatus("error");
      setMessage("Verification link is missing required information.");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch("/api/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken: accessToken ?? undefined,
            token: token ?? undefined,
            type,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Verification failed");
        }

        setStatus("success");
        setMessage(data.message || "Email verified successfully.");
      } catch (error: any) {
        setStatus("error");
        setMessage(error.message || "Verification failed.");
      }
    };

    verify();
  }, []);

  const renderIcon = () => {
    if (status === "success") {
      return <CheckCircle2 className="h-10 w-10 text-green-500" />;
    }

    if (status === "error") {
      return <XCircle className="h-10 w-10 text-red-500" />;
    }

    return <Loader2 className="h-10 w-10 text-cyan-500 animate-spin" />;
  };

  return (
    <div className="min-h-screen bg-white px-4 py-10 sm:px-6 sm:py-16 flex items-center justify-center">
      <Card className="w-full max-w-sm sm:max-w-md shadow-lg border border-gray-100">
        <CardContent className="p-6 sm:p-8 space-y-6 text-center">
          <div className="flex justify-center">{renderIcon()}</div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-cyan-500">Email Confirmation</p>
            <h1 className="text-xl sm:text-2xl font-semibold">Verify Your Email</h1>
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>
          {status === "success" && (
            <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white text-sm sm:text-base" onClick={() => setLocation("/auth")}>
              Back to Login
            </Button>
          )}
          {status === "error" && (
            <div className="space-y-3">
              <Button variant="outline" className="w-full text-sm sm:text-base" onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white text-sm sm:text-base" onClick={() => setLocation("/auth")}>
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
