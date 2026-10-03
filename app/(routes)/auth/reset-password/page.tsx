"use client";

import { useForm } from "@tanstack/react-form";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldInfo } from "@/components/field-info";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/utils/auth-client";

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState("");
  const router = useRouter();
  const [success, setSuccess] = useState<boolean>(false);

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setError("");
      if (!token) {
        setError("Missing or invalid reset token");
        return;
      }
      try {
        const res = await authClient.resetPassword({
          newPassword: value.password,
          token,
        });

        if (res.error) {
          throw new Error(res.error.message);
        }

        setSuccess(true);
        setTimeout(() => {
          router.push("/auth/signin");
        }, 1000);
      } catch (err: any) {
        setError(err.message || "Failed to reset password");
      }
    },
  });

  if (!token || token.length < 10) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-md max-sm:w-[90%]">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Reset password</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              This reset link is invalid or expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <div className="flex justify-center w-full border-t py-4">
              <Link
                href="/auth/signin"
                className="text-center text-xs text-neutral-500 underline cursor-pointer"
              >
                Back to sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-md max-sm:w-[90%]">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Reset password</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {success ? "Your password has been reset. You can sign in now." : "Choose a new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Link href="/auth/signin">
              <Button className="w-full">Sign in</Button>
            </Link>
          ) : (
            <div className="grid gap-4">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) =>
                    value.length < 8 ? "Password must be at least 8 characters" : undefined,
                }}
                children={(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>New password</Label>
                    <Input
                      id={field.name}
                      type="password"
                      autoComplete="new-password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              />
              <form.Field
                name="confirmPassword"
                validators={{
                  onChange: ({ value }) => (!value ? "Please confirm your password" : undefined),
                }}
                children={(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              />
              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                  passwordsMatch: state.values.password === state.values.confirmPassword,
                })}
                children={({ canSubmit, isSubmitting, passwordsMatch }) => (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      void form.handleSubmit();
                    }}
                    type="submit"
                    className="w-full"
                    disabled={!canSubmit || isSubmitting || !passwordsMatch}
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Reset password"}
                  </Button>
                )}
              />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="flex justify-center w-full border-t py-4">
            <Link
              href="/auth/signin"
              className="text-center text-xs text-neutral-500 underline cursor-pointer"
            >
              Back to sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
