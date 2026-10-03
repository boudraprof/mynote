"use client";

import {Loader2, Search, X } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SidebarTrigger } from "./ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { ExportMenu } from "./export-menu";
import { listViewMode, search, spinner } from "@/utils/atoms";
import Link from "next/link";
import Image from "next/image";
import {  cn } from "@/utils";
import { useMatchPath } from "@/utils/client-only";
import { DynamicIcon } from "lucide-react/dynamic";

export default function Header() {
  const [viewMode, setViewMode] = useAtom(listViewMode);
  const [value, setValue] = useAtom(search);
  const isLoading = useAtomValue(spinner);
  const isNotesPath =   useMatchPath("notes");
  const [isMobileSearch, setIsMobileSearch] = useState(false);

  return (
    <header className="absolute top-0 z-200 flex items-center w-full justify-between h-16 px-4 bg-background backdrop-blur-sm border-b">
      <div className="flex items-center gap-2">
        {!isMobileSearch && <SidebarTrigger />}
        <div className="text-xl max-sm:hidden font-semibold text-primary whitespace-nowrap flex items-center gap-2">
          <Link href="/notes" className="flex items-center gap-2">
            <Image
              src="/logo128.png"
              alt="Logo"
              width={28}
              height={28}
              className="size-7"
            />
            My Notes
          </Link>
        </div>
      </div>
      <div
        className={cn(
          "flex-1 max-w-2xl mx-4",
          !isMobileSearch && "max-sm:hidden",
        )}
      >
        <div
          onBlur={() => {
            setIsMobileSearch(false);
            setValue("");
          }}
          className="relative"
        >
          {isLoading ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-muted-foreground" />
          )}
          <Input
            type="search"
            value={value}
            placeholder="Search notes & labels"
            onChange={(e) => {
              setValue(e.target.value);
            }}
            className="pl-10 w-full h-12 max-sm:text-[12px]  rounded-lg bg-muted/50 border-transparent focus:bg-card focus:border-input"
            aria-label="Search notes and labels"
          />
          {(value.length > 0 || isMobileSearch) && (
            <Button
              onClick={() => {
                setIsMobileSearch(false);
                setValue("");
              }}
              className={cn(`absolute right-3 top-1/2 transform
               -translate-y-1/2 size-5
              text-muted-foreground`)}
              variant="ghost"
              size="icon"
            >
              <X size={20} />
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {!isMobileSearch && (
          <>
            <Button
              onClick={() => {
                setIsMobileSearch(true);
              }}
              variant="ghost"
              size="icon"
              className="sm:hidden   lg:hidden"
            >
              <Search className=" size-5 text-muted-foreground" />
            </Button>
            <ThemeToggle variant="ghost" size="icon" aria-label="DarkMode" />
          </>
        )}
        {isNotesPath && (
          <Button
            className="max-sm:hidden"
            variant="ghost"
            size="icon"
            aria-label="Toggle view"
            onClick={() => {
              setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
            }}
          >
            <DynamicIcon name={viewMode === "grid" ? 'list' : 'grid'} className="size-5" /> 
          </Button>
        )}
        {!isMobileSearch && (
          <>
            <ExportMenu />
          </>
        )}
      </div>
    </header>
  );
}
