"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import z from "zod";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldInfo } from "@/components/field-info";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/utils/auth-client";
import { GoogleSignInButton } from "@/components/google-signIn-button";

export default function SignUp() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>("");

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
    onSubmit: async ({ value }) => {
      const res = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
      });

      if (res.error?.message) {
        setErrorMessage(res.error.message);
      } else {
        router.push("/notes");
        router.refresh();
      }
    },
  });

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-md max-sm:w-[90%]">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Sign Up</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            <p>Enter your information to create an account</p>
            {errorMessage && <p className="pt-2 text-red-500">{errorMessage}</p>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onKeyUp={(e) => {
              if (e.key === "Enter") void form.handleSubmit();
            }}
            className="grid gap-7"
          >
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => (!value.trim() ? "name is required" : undefined),
              }}
              children={(field) => (
                <div className="grid gap-1">
                  <Label htmlFor={field.name}>Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="Mohammed"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  try {
                    z.string().email().parse(value);
                    return undefined;
                  } catch {
                    return "Invalid email";
                  }
                },
              }}
              children={(field) => (
                <div className="grid gap-1">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
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
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) =>
                  value.length < 8 ? "Password must be at least 8 characters" : undefined,
              }}
              children={(field) => (
                <div className="grid gap-1">
                  <Label htmlFor={field.name}>Password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    placeholder="Password"
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
              name="passwordConfirmation"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Please confirm your password";
                  if (value !== form.state.values.password) return "Passwords do not match";
                  return undefined;
                },
              }}
              children={(field) => (
                <div className="grid gap-1">
                  <Label htmlFor={field.name}>Confirm Password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    placeholder="Confirm Password"
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
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit || isSubmitting}
                  onClick={(e) => {
                    e.preventDefault();
                    void form.handleSubmit();
                  }}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Create your account"}
                </Button>
              )}
            />
            <GoogleSignInButton />
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex justify-center w-full border-t py-4">
            <Link href="/auth/signin" className="text-center text-xs text-neutral-500 underline cursor-pointer">
              Already have an account? Sign In
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

