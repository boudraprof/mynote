"use client";

import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FieldInfo } from "@/components/field-info";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/utils/auth-client";
import { GoogleSignInButton } from "@/components/google-signIn-button";

export default function SignIn() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    onSubmit: async ({ value }) => {
      const res = await authClient.signIn.email({
        email: value.email,
        password: value.password,
        rememberMe: value.rememberMe,
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
          <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
          <CardDescription className="flex flex-col text-xs md:text-sm">
            <p>Enter your email below to login to your account</p>
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
              name="email"
              validators={{
                onChange: ({ value }) => {
                  try {
                    z.email().parse(value);
                    return;
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
                onChange: ({ value }) => (!value ? "Password is required" : undefined),
              }}
              children={(field) => (
                <div className="grid gap-1">
                  <Label htmlFor={field.name}>Password</Label>
                  <div className="relative">
                    <Input
                      id={field.name}
                      name={field.name}
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      autoComplete="current-password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="rememberMe"
              children={(field) => (
                <div className="flex items-center gap-1">
                  <Checkbox
                    id="remember"
                    checked={field.state.value}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked === true);
                    }}
                  />
                  <Label htmlFor="remember">Remember me</Label>
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
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Login"}
                </Button>
              )}
            />
            <GoogleSignInButton />
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex justify-center w-full border-t py-4">
            <div className="flex flex-col gap-3 text-xs text-neutral-500">
              <Link href="/auth/forgot-password" className="text-center text-sm hover:underline">
                Forgot password?
              </Link>
              <Link href="/auth/signup" className="underline text-xs cursor-pointer text-center">
                Don&apos;t have an account? Sign Up
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}