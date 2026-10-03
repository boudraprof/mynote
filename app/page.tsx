"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Zap,
  Cloud,
  Lock,
  Smartphone,
  Globe,
  Heart,
  ChevronRight,
  Users
} from "lucide-react";
import Image from "next/image";

import { useSession } from "./utils/auth-client";

const features = [
  {
    icon: NotebookPen,
    title: "Capture ideas instantly",
    description:
      "Write notes, quick thoughts, and personal plans in one calm workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Stay organized",
    description:
      "Use labels, reminders, and archive states to keep everything in context.",
  },
  {
    icon: Clock3,
    title: "Keep momentum",
    description:
      "Jump back into important notes whenever inspiration or obligations reappear.",
  },
];

const checklist = [
  "Minimal, distraction-free writing flow",
  "Smart note organization with labels",
  "Safe and private access for your workspace",
];

const allFeatures = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built for speed. Your notes sync instantly across all your devices without any lag.",
  },
  {
    icon: Cloud,
    title: "Cloud Synced",
    description: "Never lose a thought. Everything is safely backed up to our secure cloud servers.",
  },
  {
    icon: Lock,
    title: "End-to-End Encrypted",
    description: "Your data is yours alone. We use military-grade encryption to keep your notes private.",
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Access your workspace anywhere with our beautiful and responsive mobile applications.",
  },
  {
    icon: Globe,
    title: "Access Anywhere",
    description: "Whether on desktop, tablet, or mobile web, your notes are always just a tap away.",
  },
  {
    icon: Heart,
    title: "Crafted with Love",
    description: "Designed with a focus on typography, spacing, and a distraction-free writing experience.",
  }
];

const services = [
  {
    title: "Personal Workspace",
    description: "A private, distraction-free environment tailored for individual productivity and thought organization.",
    price: "Free",
    icon: NotebookPen,
  },
  {
    title: "Team Collaboration",
    description: "Share notes, assign tasks, and build a collective knowledge base with your entire team seamlessly.",
    price: "$8/mo",
    icon: Users,
  },
  {
    title: "Enterprise Solutions",
    description: "Advanced security, custom integrations, and dedicated support for large-scale organizations.",
    price: "Custom",
    icon: ShieldCheck,
  }
];

export default function HomePage() {
  const { data, isPending } = useSession();

  return (
    <main 
    className="min-h-screen text-slate-900 dark:text-slate-100"
    >
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 pt-6 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center">
              <Image alt="Logo" src={'/logo128.png'}  width={20} height={20}/>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                My Notes
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex dark:text-slate-300">
            <Link
              href="/#about"
              className="transition hover:text-slate-900 dark:hover:text-white"
            >
              About
            </Link>
            <Link
              href="/#features"
              className="transition hover:text-slate-900 dark:hover:text-white"
            >
              Features
            </Link>
            <Link
              href="/#services"
              className="transition hover:text-slate-900 dark:hover:text-white"
            >
              Services
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {isPending ? (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Loading...
              </span>
            ) : data?.user ? (
              <Link href="/notes" className="flex items-center gap-2">
                <span>
                  {data.user.image ? (
                    <Image
                      className="size-9 rounded-full"
                      src={data.user.image}
                      width={20}
                      height={20}
                      alt="Profile Image"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {data.user.name[0]?.toUpperCase()}
                    </span>
                  )}
                </span>
                <p>{data.user.name}</p>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="relative flex flex-1 items-center py-16 lg:py-20">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Sparkles className="h-4 w-4" />
                Your ideas, beautifully organized
              </div>

              <h1 className="text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl dark:text-white">
                Write more clearly.
                <span className="mt-2 block text-slate-700 dark:text-slate-200">
                  Remember what matters.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-300">
                Capture thoughts, notes, and tasks in a calmer workspace built
                to help you move from ideas to action without losing momentum.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-base font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Start writing
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/notes"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-base font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Read all notes
                </Link>
              </div>

              <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {checklist.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -left-10 top-12 h-52 w-52 rounded-full bg-slate-300/60 blur-3xl dark:bg-slate-700/40" />
              <div className="absolute -right-6 bottom-8 h-56 w-56 rounded-full bg-slate-200/80 blur-3xl dark:bg-slate-700/40" />

              <div className="relative rounded-[2rem] border border-slate-200/80  p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-800">
                <div className="rounded-[1.5rem] border border-slate-200  p-4 dark:border-slate-800 ">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      Daily Notes
                    </span>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Today
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                        Product launch ideas
                      </h2>
                    </div>

                    <div className="rounded-2xl border border-slate-200  p-4 shadow-sm ">
                      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        Highlights
                      </div>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <li className="flex gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-slate-800 dark:bg-slate-300" />
                          Refine onboarding message with a simpler three-step
                          flow.
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-slate-500 dark:bg-slate-400" />
                          Prepare a teaser snippet for launch day and social
                          posts.
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                          Share the beta feedback roundup with the team.
                        </li>
                      </ul>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {features.map(({ icon: Icon, title, description }) => (
                        <div
                          key={title}
                          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 bg-background!"
                        >
                          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {title}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="relative py-24 lg:py-32 scroll-mt-24">
          <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl -mx-4 sm:mx-0 px-4 sm:px-0" />
          <div className="relative">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-sm font-semibold tracking-widest text-indigo-500 uppercase mb-3">Features</h2>
              <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">
                Everything you need to capture ideas
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                We've built a suite of tools designed to help you focus on what matters most: your thoughts.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {allFeatures.map(({ icon: Icon, title, description }) => (
                <div 
                  key={title} 
                  className="group relative rounded-3xl border border-slate-200/60 bg-white/50 p-8 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/50"
                >
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative">
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 transition-colors group-hover:bg-indigo-500 group-hover:text-white dark:bg-indigo-500/20 dark:text-indigo-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{title}</h4>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section id="services" className="relative py-24 lg:py-32 scroll-mt-24 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-sm font-semibold tracking-widest text-emerald-500 uppercase mb-3">Services</h2>
              <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white mb-6">
                Tailored solutions for every need
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
                Whether you're a student capturing lecture notes, a professional organizing projects, or a team building a knowledge base, we have a plan for you.
              </p>
              
              <div className="space-y-6">
                {services.map((service, idx) => (
                  <div key={idx} className="group flex items-start gap-4 p-4 rounded-2xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                      <service.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{service.title}</h4>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{service.price}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{service.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-3xl rounded-full" />
              <div className="relative rounded-[2rem] border border-slate-200/80 bg-white/50 p-2 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50 overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Sparkles className="w-32 h-32" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 rounded-[1.5rem] p-8 h-full border border-slate-200/50 dark:border-slate-800/50">
                  <div className="h-40 w-full rounded-xl bg-gradient-to-r from-emerald-400/20 to-teal-400/20 flex items-center justify-center mb-8">
                     <Users className="w-16 h-16 text-emerald-500 opacity-50" />
                  </div>
                  <h4 className="text-2xl font-semibold mb-2 text-slate-900 dark:text-white">Start collaborating today</h4>
                  <p className="text-slate-500 mb-6">Upgrade your workspace to unlock advanced team features and robust administrative controls.</p>
                  <Link href="/auth/signup" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                    Upgrade to Team
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="relative py-24 lg:py-32 scroll-mt-24 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="absolute -left-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-rose-400/20 blur-[100px]" />
          <div className="absolute -right-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-amber-400/20 blur-[100px]" />
          
          <div className="relative max-w-4xl mx-auto text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 text-sm font-medium mb-6 border border-rose-500/20">
               <Heart className="w-4 h-4" />
               Our Mission
             </div>
             <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-slate-900 dark:text-white mb-8">
               Building a calmer corner of the internet.
             </h2>
             <p className="text-lg md:text-xl leading-relaxed text-slate-600 dark:text-slate-300 mb-12">
               We believe that great ideas are born in quiet spaces. Our goal is to provide a digital sanctuary where your thoughts can breathe, free from the endless notifications and clutter of modern productivity tools. We designed My Notes to be invisible when you don't need it, and powerful when you do.
             </p>
             
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-8 py-4 text-base font-medium text-white transition hover:bg-rose-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/20"
                >
                  Join our community
                  <ChevronRight className="h-5 w-5" />
                </Link>
             </div>
          </div>
        </section>

        <footer className="text-center text-sm border-t border-slate-200/50 dark:border-slate-800/50 py-10 mt-10">
          <div className="flex items-center justify-center gap-2 mb-4">
             <div className="flex h-6 w-6 items-center justify-center">
               <Image alt="Logo" src={'/logo128.png'}  width={20} height={20}/>
             </div>
             <span className="font-semibold tracking-widest text-slate-500 uppercase">My Notes</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400">© 2026 My Notes. Crafted with intention.</p>
        </footer>
      </div>
    </main>
  );
}
