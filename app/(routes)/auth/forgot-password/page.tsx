"use client";

import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import z from "zod";
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
import { authClient } from "@/utils/auth-client";

export default function ForgotPassword() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<boolean>(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      setError("");
      try {
        const res = await authClient.requestPasswordReset({
          email: value.email,
          redirectTo: "/auth/reset-password",
        });

        if (res.error) {
          throw new Error(res.error.message);
        }

        setSuccess(true);
      } catch (err: any) {
        setError(err.message || "Failed to send reset email");
      }
    },
  });

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-md max-sm:w-[90%]">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Forgot password</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {success
              ? "If an account exists for that email, we sent reset instructions."
              : "Enter your email and we will send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Link href="/auth/signin" className="w-full">
              <Button className="w-full">Back to sign in</Button>
            </Link>
          ) : (
            <div className="grid gap-4">
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    try {
                      z.email().parse(value);
                      return undefined;
                    } catch {
                      return "Invalid email";
                    }
                  },
                }}
                children={(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      type="email"
                      placeholder="email@email.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      void form.handleSubmit();
                    }}
                    type="submit"
                    className="w-full"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Send reset link"
                    )}
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
              Remembered your password? Sign In
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

