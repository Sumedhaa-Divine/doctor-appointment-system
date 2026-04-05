import { Amplify } from "aws-amplify";
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchUserAttributes,
  type SignInInput,
  type SignUpInput,
} from "aws-amplify/auth";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "",
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
          redirectSignOut: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
          responseType: "code",
        },
      },
    },
  },
});

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
}

export async function cognitoSignIn({ email, password }: SignInInput) {
  return signIn({ username: email, password });
}

export async function cognitoSignUp({
  email,
  password,
  firstName,
  lastName,
  role,
  phone,
}: RegisterInput) {
  const input: SignUpInput = {
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        given_name: firstName,
        family_name: lastName,
        phone_number: phone ?? "",
        "custom:role": role,
      },
    },
  };
  return signUp(input);
}

export async function cognitoConfirmSignUp(email: string, code: string) {
  return confirmSignUp({ username: email, confirmationCode: code });
}

export async function cognitoSignOut() {
  return signOut();
}

export async function cognitoResetPassword(email: string) {
  return resetPassword({ username: email });
}

export async function cognitoConfirmResetPassword(
  email: string,
  code: string,
  newPassword: string
) {
  return confirmResetPassword({ username: email, confirmationCode: code, newPassword });
}

export async function getCognitoUser() {
  try {
    const user = await getCurrentUser();
    const attributes = await fetchUserAttributes();
    return { user, attributes };
  } catch {
    return null;
  }
}
