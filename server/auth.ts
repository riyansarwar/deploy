import { Express, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create admin client if service role key is available
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export interface AuthRequest extends Request {
  user?: any;
}

// Middleware to authenticate using Supabase Auth token
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    const dbUser = await storage.getUserByEmail(user.email!);
    if (!dbUser) {
      return res.status(401).json({ message: "User not found in database" });
    }

    if (!dbUser.emailVerified) {
      return res.status(403).json({ message: "Please verify your email before accessing the app" });
    }
    
    req.user = dbUser;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

export function setupAuth(app: Express) {
  // Registration endpoint
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, role, username } = req.body;

      if (!email || !password || !firstName || !lastName || !role || !username) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create user in Supabase Auth (requires email verification)
      const { data: { user: authUser }, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.APP_URL || "http://localhost:5173"}/verify-email`,
          data: {
            username,
            firstName,
            lastName,
            role,
          }
        }
      });

      if (authError) {
        console.error("Supabase auth error:", authError);
        return res.status(400).json({ message: authError.message });
      }

      if (!authUser) {
        return res.status(500).json({ message: "Failed to create auth user" });
      }

      // Create user in database (without password - managed by Supabase)
      const newUser = await storage.createUser({
        username,
        email,
        password: "",
        confirmPassword: "",
        firstName,
        lastName,
        role: role as "teacher" | "student",
        emailVerified: false,
      });

      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json({
        message: "Registration successful. Please check your email to verify your account.",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/verify-email", async (req: Request, res: Response) => {
    try {
      const { accessToken, token, type } = req.body;

      if (!accessToken && !token) {
        return res.status(400).json({ message: "Verification data is missing" });
      }

      const otpType = "signup" as const;

      if (type && type !== otpType) {
        return res.status(400).json({ message: "Unsupported verification type" });
      }

      let email: string | null = null;

      if (accessToken) {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
          console.error("Verification error:", error);
          return res.status(400).json({ message: "Invalid verification token" });
        }

        if (!user.email_confirmed_at) {
          return res.status(400).json({ message: "Email is not confirmed yet" });
        }

        email = user.email ?? null;
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: otpType,
        });

        if (error) {
          console.error("Verification error:", error);
          return res.status(400).json({ message: error.message });
        }

        if (!data.user) {
          return res.status(400).json({ message: "Failed to verify email" });
        }

        email = data.user.email ?? null;
      }

      if (!email) {
        return res.status(400).json({ message: "Unable to determine user email" });
      }

      await storage.markEmailVerifiedByEmail(email);

      res.json({
        message: "Email verified successfully. You can now login."
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { email, password, role } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Authenticate with Supabase
      const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !session) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify email is confirmed
      const { data: { user: confirmUser }, error: confirmError } = await supabase.auth.getUser(session.access_token);
      
      if (!confirmUser?.email_confirmed_at) {
        return res.status(403).json({ message: "Please verify your email before logging in" });
      }

      // Get user from database
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ message: "Please verify your email before logging in" });
      }

      // Validate that the selected role matches the user's actual role
      if (role && role !== user.role) {
        return res.status(401).json({ 
          message: `Invalid role. You are registered as a ${user.role}, please select the ${user.role} role to login.` 
        });
      }

      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        message: "Login successful",
        token: session.access_token,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user endpoint
  app.get("/api/user", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { password: _, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        await supabase.auth.signOut();
      }

      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change password endpoint (authenticated user)
  app.post("/api/user/password", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Password change is not properly configured. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in environment variables." });
      }

      const user = req.user;
      if (!user || !user.email) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Verify current password by attempting to sign in
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError || !session) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Get the Supabase auth user ID from the session
      const authUserId = session.user.id;

      // Update password using admin API
      const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password update error:", updateError);
        return res.status(400).json({ message: updateError.message || "Failed to update password" });
      }

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Forgot password endpoint (send reset email)
  app.post("/api/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists in our database
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return same response for security (don't reveal if email exists)
        return res.json({ 
          message: "If an account exists with this email, a password reset link has been sent." 
        });
      }

      // Send password reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.APP_URL || "http://localhost:5173"}/reset-password`
      });

      if (error) {
        console.error("Password reset email error:", error);
        return res.json({ 
          message: "If an account exists with this email, a password reset link has been sent." 
        });
      }

      res.json({ 
        message: "If an account exists with this email, a password reset link has been sent." 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.json({ 
        message: "If an account exists with this email, a password reset link has been sent." 
      });
    }
  });

  // Reset password endpoint (verify token and update password)
  app.post("/api/reset-password", async (req: Request, res: Response) => {
    try {
      const { accessToken, newPassword } = req.body;

      if (!accessToken || !newPassword) {
        return res.status(400).json({ message: "Access token and new password are required" });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Password reset is not properly configured. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in environment variables." });
      }

      // Verify the access token by getting the user
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

      if (userError || !user) {
        console.error("Token verification error:", userError);
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Update password using admin API
      const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password reset error:", updateError);
        return res.status(400).json({ message: updateError.message || "Failed to reset password" });
      }

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
