import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyInvitation } from "@/lib/api";
import { toast } from "sonner";

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Auth() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [verifyingInvite, setVerifyingInvite] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Extract invite code from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("invite");

    if (code) {
      setInviteCode(code);
      setActiveTab("signup"); // Set tab to signup when invite code is present

      // Verify the invitation to get details
      setVerifyingInvite(true);
      verifyInvitation(code)
        .then((data) => {
          setInviteData(data);
        })
        .catch((error) => {
          console.error("Error verifying invitation:", error);
          toast.error("The invitation link appears to be invalid or expired");
        })
        .finally(() => {
          setVerifyingInvite(false);
        });
    }
  }, [location]);

  // Redirect to chat if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // If there's an invite code, redirect to the invite page to redeem it
      if (inviteCode) {
        navigate(`/invite/${inviteCode}`);
      } else {
        navigate("/chat");
      }
    }
  }, [isAuthenticated, navigate, inviteCode]);

  // Add this useEffect after the other useEffect hooks (around line 75-80)
  useEffect(() => {
    // Reset loading state when switching tabs
    setLoading(false);
  }, [activeTab]);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Signup form state
  const [signupForm, setSignupForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  // Login form errors
  const [loginErrors, setLoginErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Signup form errors
  const [signupErrors, setSignupErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Validation states
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Add state for field-specific server errors
  const [serverErrors, setServerErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
    general?: string;
  }>({});

  // Add these new state variables
  const [loginPasswordFocused, setLoginPasswordFocused] = useState(false);
  const [signupPasswordFocused, setSignupPasswordFocused] = useState(false);

  // Validation functions
  const validateUsername = (value: string): boolean => {
    if (!value.trim()) {
      setUsernameError("Username is required");
      return false;
    }

    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }

    if (value.length > 30) {
      setUsernameError("Username must be less than 30 characters");
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError(
        "Username can only contain letters, numbers, and underscores"
      );
      return false;
    }

    setUsernameError("");
    return true;
  };

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }

    setEmailError("");
    return true;
  };

  const validatePassword = (value: string): boolean => {
    // Check for empty password
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }

    // Check length requirement
    if (value.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }

    // Check complexity requirements
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    if (!(hasUppercase && hasLowercase && (hasNumber || hasSpecial))) {
      setPasswordError(
        "Password must include uppercase, lowercase, and a number or special character"
      );
      return false;
    }

    setPasswordError("");
    return true;
  };

  // Form validation
  const validateSignupForm = (): boolean => {
    const isUsernameValid = validateUsername(signupForm.username);
    const isEmailValid = validateEmail(signupForm.email);
    const isPasswordValid = validatePassword(signupForm.password);

    return isUsernameValid && isEmailValid && isPasswordValid;
  };

  const validateLoginForm = (): boolean => {
    const isEmailValid = validateEmail(loginForm.email);
    const isPasswordValid = validatePassword(loginForm.password);

    return isEmailValid && isPasswordValid;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // First clear previous errors
    setError("");
    setSuccess("");

    // Force validation of both fields BEFORE checking if they're valid
    // This ensures error messages display immediately
    const emailValid = validateEmail(loginForm.email);
    const passwordValid = validatePassword(loginForm.password);

    // Important: Check validation results AFTER forcing validation
    if (!emailValid || !passwordValid) {
      console.log("Login validation failed, form errors displayed");
      // Explicitly ensure loading is false
      setLoading(false);
      return;
    }

    // At this point validation has passed
    console.log("Login validation passed, proceeding with login attempt");

    try {
      // AFTER validation, now we can set loading to true
      console.log("Setting loading state to true AFTER validation");
      setLoading(true);

      console.log("Attempting login with email:", loginForm.email);
      const success = await login(loginForm.email, loginForm.password);

      console.log("Login successful, redirecting to chat...");
      // Keep loading true for redirect
    } catch (err: any) {
      // Login failed
      console.log("Login failed:", err.message);
      setError("Wrong email or password");

      // Explicitly set loading to false
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Always clear ALL errors and messages on submit attempt
    setError("");
    setSuccess("");
    setServerErrors({});
    setUsernameError("");
    setEmailError("");
    setPasswordError("");

    // Validate form first
    if (!validateSignupForm()) {
      return;
    }

    try {
      const result = await signup(
        signupForm.username,
        signupForm.email,
        signupForm.password
      );

      // If signup was successful
      setSuccess("Account created successfully! Please log in.");
      setActiveTab("login");
      setSignupForm({
        username: "",
        email: "",
        password: "",
      });
    } catch (err: any) {
      // Error handling for existing accounts
      if (err.message?.toLowerCase().includes("already exists")) {
        console.log("User already exists:", err.message);
        setError("Account already exists");
        setServerErrors({
          email: "This email is already registered",
        });
      } else if (err.field) {
        setServerErrors({
          ...serverErrors,
          [err.field]: err.message,
        });
      } else {
        setError(err.message || "Signup failed");
      }
    }
  };

  // Update CardHeader to include invite information if present
  const getCardHeader = () => (
    <CardHeader className="space-y-2 p-6 pb-4 bg-gray-950/30">
      <CardTitle className="text-2xl font-bold text-center text-white">
        {inviteData ? "Join Echo Chat" : "Echo Chat"}
      </CardTitle>
      <CardDescription className="text-center text-gray-300">
        {inviteData ? (
          <>
            <span className="font-medium">
              {inviteData.invitation.createdBy.username}
            </span>{" "}
            has invited you to join{" "}
            {inviteData.invitation.channel
              ? `the "${inviteData.invitation.channel.name}" channel`
              : "Echo Chat"}
          </>
        ) : (
          "Connect and collaborate in real-time"
        )}
      </CardDescription>
    </CardHeader>
  );

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Card className="w-full max-w-md mx-auto overflow-hidden shadow-xl border-0">
        {getCardHeader()}
        <CardContent className="p-6 pt-5 pb-8 bg-gray-950/20">
          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={(v) => {
              // First clear all errors and messages
              setError("");
              setSuccess("");
              setServerErrors({});
              setUsernameError("");
              setEmailError("");
              setPasswordError("");
              setLoginErrors({});
              setSignupErrors({});

              // Reset form values completely
              if (v === "login") {
                setSignupForm({
                  username: "",
                  email: "",
                  password: "",
                });
              } else {
                setLoginForm({
                  email: "",
                  password: "",
                  rememberMe: false,
                });
              }

              // Set the active tab last, after all state is cleared
              setActiveTab(v as "login" | "signup");
            }}
            className="w-full"
          >
            <div className="auth-tabs-list">
              <div
                className={`auth-tab ${
                  activeTab === "login"
                    ? "auth-tab-active"
                    : "auth-tab-inactive"
                }`}
                onClick={() => {
                  // Clear all errors when clicking tab directly
                  setError("");
                  setSuccess("");
                  setServerErrors({});
                  setUsernameError("");
                  setEmailError("");
                  setPasswordError("");
                  setLoginErrors({});
                  setSignupErrors({});
                  setActiveTab("login");
                }}
              >
                Login
              </div>
              <div
                className={`auth-tab ${
                  activeTab === "signup"
                    ? "auth-tab-active"
                    : "auth-tab-inactive"
                }`}
                onClick={() => {
                  // Clear all errors when clicking tab directly
                  setError("");
                  setSuccess("");
                  setServerErrors({});
                  setUsernameError("");
                  setEmailError("");
                  setPasswordError("");
                  setLoginErrors({});
                  setSignupErrors({});
                  setActiveTab("signup");
                }}
              >
                Sign Up
              </div>
            </div>

            <TabsContent value="login" className="">
              <div className="bg-gray-900/70 p-4 rounded-lg">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {success && (
                    <div className="p-2 mb-4 bg-green-100 text-green-700 rounded">
                      {success}
                    </div>
                  )}

                  {error ? (
                    <div className="p-3 bg-red-500/20 border border-red-500 rounded-md text-red-200 text-center mb-4">
                      <p className="font-medium">
                        {error.toLowerCase().includes("wrong")
                          ? error
                          : "Wrong email or password"}
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-left block text-sm font-medium text-gray-200"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => {
                        setLoginForm({ ...loginForm, email: e.target.value });
                        validateEmail(e.target.value);
                      }}
                      placeholder="Enter your email address"
                      className={`bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 ${
                        emailError ? "border-red-500" : ""
                      }`}
                    />
                    {emailError && (
                      <p className="text-xs text-red-400 mt-1">{emailError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-left block text-sm font-medium text-gray-200"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showLoginPassword ? "text" : "password"}
                        value={loginForm.password}
                        onChange={(e) => {
                          setLoginForm({
                            ...loginForm,
                            password: e.target.value,
                          });
                          // Immediately validate as user types
                          validatePassword(e.target.value);
                        }}
                        onFocus={() => setLoginPasswordFocused(true)}
                        onBlur={() => setLoginPasswordFocused(false)}
                        className={`bg-gray-800/50 border-gray-700 text-white pr-10 ${
                          passwordError ? "border-red-500" : ""
                        }`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-xs text-red-400 mt-1">
                        {passwordError}
                      </p>
                    )}
                    {/* Only show helper text when focused or after typing started */}
                    {!passwordError &&
                      (loginPasswordFocused || loginForm.password !== "") && (
                        <p className="text-gray-500 text-xs mt-1">
                          Password must be at least 8 characters and include
                          uppercase, lowercase, and a number or special
                          character.
                        </p>
                      )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={loginForm.rememberMe}
                      onCheckedChange={(checked) =>
                        setLoginForm({
                          ...loginForm,
                          rememberMe: checked === true,
                        })
                      }
                      className="border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor="remember-me"
                      className="text-sm font-medium text-gray-300 cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full mt-4 bg-primary hover:bg-primary/90 text-white py-2"
                    disabled={loading}
                    onClick={(e) => {
                      // Additional safety check to prevent spinner if validation will fail
                      if (!loginForm.email || !loginForm.password) {
                        e.preventDefault();
                        validateEmail(loginForm.email);
                        validatePassword(loginForm.password);
                        return;
                      }
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        {isAuthenticated ? "Loading chat..." : "Logging in..."}
                      </span>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </div>
            </TabsContent>
            <TabsContent value="signup" className="pb-6">
              <div className="bg-gray-900/70 p-4 rounded-lg">
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {error && error.toLowerCase().includes("already exists") ? (
                    <div className="p-3 bg-red-500/20 border border-red-500 rounded-md text-red-200 text-center mb-4">
                      <p className="font-medium">Account already exists</p>
                    </div>
                  ) : error ? (
                    <div className="p-3 bg-red-500/20 border border-red-500 rounded-md text-red-200 text-center mb-4">
                      <p className="font-medium">{error}</p>
                    </div>
                  ) : null}

                  {Object.values(serverErrors).some(Boolean) && !error && (
                    <div className="p-3 bg-red-500/20 border border-red-500 rounded-md text-red-200 text-sm mb-4">
                      <strong>Please fix the following errors:</strong>
                      <ul className="list-disc pl-5 mt-1">
                        {serverErrors.username && (
                          <li>{serverErrors.username}</li>
                        )}
                        {serverErrors.email && <li>{serverErrors.email}</li>}
                        {serverErrors.password && (
                          <li>{serverErrors.password}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="text-left block text-sm font-medium text-gray-200"
                    >
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={signupForm.username}
                      onChange={(e) => {
                        setSignupForm({
                          ...signupForm,
                          username: e.target.value,
                        });
                        validateUsername(e.target.value);
                      }}
                      placeholder="Choose a username"
                      className={`bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 ${
                        usernameError ? "border-red-500" : ""
                      }`}
                    />
                    {usernameError && (
                      <p className="text-xs text-red-400 mt-1">
                        {usernameError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signup-email"
                      className="text-left block text-sm font-medium text-gray-200"
                    >
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupForm.email}
                      onChange={(e) => {
                        setSignupForm({ ...signupForm, email: e.target.value });
                        validateEmail(e.target.value);
                        // Clear errors when user starts typing
                        if (serverErrors.email) {
                          setServerErrors({
                            ...serverErrors,
                            email: undefined,
                          });
                        }
                        if (error && error.includes("email already exists")) {
                          setError("");
                        }
                      }}
                      placeholder="Enter your email address"
                      className={`bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 ${
                        emailError ||
                        serverErrors.email ||
                        (error && error.includes("email already exists"))
                          ? "border-red-500"
                          : ""
                      }`}
                    />
                    {emailError && (
                      <p className="text-xs text-red-400 mt-1">{emailError}</p>
                    )}
                    {serverErrors.email && (
                      <p className="text-xs text-red-400 mt-1">
                        This email is already registered
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signup-password"
                      className="text-left block text-sm font-medium text-gray-200"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        value={signupForm.password}
                        onChange={(e) => {
                          setSignupForm({
                            ...signupForm,
                            password: e.target.value,
                          });
                          validatePassword(e.target.value);
                        }}
                        onFocus={() => setSignupPasswordFocused(true)}
                        onBlur={() => setSignupPasswordFocused(false)}
                        className={`bg-gray-800/50 border-gray-700 text-white pr-10 ${
                          passwordError ? "border-red-500" : ""
                        }`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200"
                        onClick={() =>
                          setShowSignupPassword(!showSignupPassword)
                        }
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-xs text-red-400 mt-1">
                        {passwordError}
                      </p>
                    )}
                    {/* Only show helper text when focused or after typing started */}
                    {!passwordError &&
                      (signupPasswordFocused || signupForm.password !== "") &&
                      activeTab === "signup" && (
                        <p className="text-gray-500 text-xs mt-1">
                          Password must be at least 8 characters and include
                          uppercase, lowercase, and a number or special
                          character.
                        </p>
                      )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full mt-4 bg-primary hover:bg-primary/90 text-white py-2"
                  >
                    {inviteCode ? "Sign Up & Accept Invitation" : "Sign Up"}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center p-6 pt-4 bg-gray-950/30 border-t border-gray-800">
          <div className="text-center text-sm text-gray-400">
            {activeTab === "login" ? (
              <div>
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 text-primary hover:text-primary/90"
                  onClick={() => setActiveTab("signup")}
                >
                  Sign up
                </Button>
              </div>
            ) : (
              <div>
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 text-primary hover:text-primary/90"
                  onClick={() => setActiveTab("login")}
                >
                  Log in
                </Button>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
