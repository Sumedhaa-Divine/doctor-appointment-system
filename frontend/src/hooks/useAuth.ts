"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import {
  cognitoSignIn,
  cognitoSignUp,
  cognitoSignOut,
  cognitoConfirmSignUp,
  cognitoResetPassword,
  type RegisterInput,
} from "@/lib/cognito";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, setUser, logout: storeLogout } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        await cognitoSignIn({ username: email, password });
        // After sign-in, fetch user profile from your API and populate store
        toast.success("Welcome back!");
        router.push("/dashboard");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Login failed";
        toast.error(message);
        throw err;
      }
    },
    [router]
  );

  const register = useCallback(
    async (data: RegisterInput) => {
      try {
        await cognitoSignUp(data);
        toast.success("Account created! Please check your email for the verification code.");
        router.push(`/auth/verify?email=${encodeURIComponent(data.email)}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Registration failed";
        toast.error(message);
        throw err;
      }
    },
    [router]
  );

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      try {
        await cognitoConfirmSignUp(email, code);
        toast.success("Email verified! You can now log in.");
        router.push("/auth/login");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Verification failed";
        toast.error(message);
        throw err;
      }
    },
    [router]
  );

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await cognitoResetPassword(email);
      toast.success("Reset code sent to your email.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send reset code";
      toast.error(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await cognitoSignOut();
      storeLogout();
      router.push("/");
    } catch {
      storeLogout();
      router.push("/");
    }
  }, [router, storeLogout]);

  return { user, isAuthenticated, isLoading, login, register, verifyEmail, forgotPassword, logout, setUser };
}
