"use client";

import { Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DynamicIcon } from "lucide-react/dynamic";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import SidebarFooterMenu from "./sidebar-footer-menu";
import type { ReactNode } from "react";
import type { IconName } from "lucide-react/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";
import api from "@/utils/axios";
import { labelsKeys } from "@/utils/query-keys";
import { useSession } from "@/utils/auth-client";

type Label = { id: string; name: string };

const NavItemSkeleton = ({ children }: { children?: ReactNode }) => (
  <SidebarMenuItem>
    <SidebarMenuButton size="lg" className="cursor-wait">
      {children ? children : <Tag className="size-5 rounded opacity-30" />}
      <Skeleton className="h-4 w-24" />
    </SidebarMenuButton>
  </SidebarMenuItem>
);

export default function MainSidebar() {
  const sidebarNavItems = [
    { name: "notes", label: "Notes", icon: "lightbulb", path: "/notes" },
    {
      name: "reminders",
      label: "Reminders",
      icon: "bell",
      path: "/notes/reminders",
    },
    {
      name: "archive",
      label: "Archive",
      icon: "archive",
      path: "/notes/archive",
    },
    { name: "trash", label: "Trash", icon: "trash", path: "/notes/trash" },
  ];

  const queryClient = useQueryClient();

  const labelsQuery = useQuery({
    queryKey: labelsKeys.all,
    queryFn: async () => {
      const { data } = await api.get<{ data: Array<Label> }>("/labels");
      return data.data;
    },
  });

  const addLabelMutation = useMutation({
    mutationFn: (name: string) => api.post("/labels", { name }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: labelsKeys.all }),
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/labels?id=${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: labelsKeys.all }),
  });

  const allLabels = labelsQuery.data ?? [];
  const labelsLoading = labelsQuery.isPending;
  const [isEditingLabels, setIsEditingLabels] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const currentRoute = usePathname();
  const searchParams = useSearchParams();
  const currentLabel = searchParams.get("label");
  const activeNavItem = currentLabel
    ? currentLabel
    : currentRoute === "/notes/reminders"
      ? "reminders"
      : currentRoute === "/notes/archive"
        ? "archive"
        : currentRoute === "/notes/trash"
          ? "trash"
          : "notes";

  const handleAddLabel = useCallback(() => {
    const name = newLabelName.trim();
    if (!name) return;
    addLabelMutation.mutate(name);
    setNewLabelName("");
  }, [newLabelName, addLabelMutation]);

  const handleDeleteLabel = useCallback(
    (id: string) => {
      deleteLabelMutation.mutate(id);
    },
    [deleteLabelMutation],
  );

  const handleLabelClick = useCallback(
    (labelName: string) => {
      setIsEditingLabels(false);
      router.replace(`/notes/?label=${encodeURIComponent(labelName)}`);
      setOpenMobile(false);
    },
    [router],
  );

  const handleNavClick = useCallback(
    (item: (typeof sidebarNavItems)[number]) => {
      router.push(item.path);
      setOpenMobile(false);
      setIsEditingLabels(false);
    },
    [router],
  );

  const { data, isPending } = useSession();

  return (
    <Sidebar
      className="border-none"
      collapsible={isMobile ? "offcanvas" : "icon"}
    >
      <SidebarHeader className="p-2 bg-background  border-none! flex justify-center items-center h-16 max-sm:h-30 border-b">
        <Image
          width={32}
          height={32}
          src="/logo128.png"
          alt="Logo"
          className="group-data-[collapsible=icon]:size-8"
        />
        <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden whitespace-nowrap">
          My Notes
        </span>
      </SidebarHeader>
      <SidebarContent className="p-2 bg-background">
        <SidebarMenu>
          {sidebarNavItems.map((item: (typeof sidebarNavItems)[number]) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                onClick={() => {
                  handleNavClick(item);
                }}
                isActive={activeNavItem === item.name && !isEditingLabels}
                tooltip={item.label}
                className={cn(
                  "justify-start",
                  "bg-background!",
                  activeNavItem === item.name &&
                    "bg-foreground! text-background!",
                )}
                size="lg"
              >
                <DynamicIcon name={item.icon as IconName} className="size-5" />
                <Link
                  href={item.path}
                  className="group-data-[collapsible=icon]:hidden"
                >
                  {item.label}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                setIsEditingLabels((v) => !v);
              }}
              isActive={isEditingLabels}
              className={cn(
                "justify-start",
                "bg-background!",
                isEditingLabels && "bg-foreground! text-background!",
              )}
              tooltip="Edit labels"
              size="lg"
            >
              <Pencil className="size-5" />
              <span className="group-data-[collapsible=icon]:hidden flex-1">
                Edit labels
              </span>
              {isEditingLabels && (
                <X
                  className="size-4 group-data-[collapsible=icon]:hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingLabels(false);
                  }}
                />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {isEditingLabels && (
            <SidebarMenuItem>
              <div className="flex items-center  my-5 px-2 group-data-[collapsible=icon]:hidden">
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLabel();
                  }}
                  placeholder="New label name"
                  className="h-8 text-xs flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={handleAddLabel}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </SidebarMenuItem>
          )}

          {labelsLoading
            ? [1, 2, 3, 4].map((i) => <NavItemSkeleton key={i} />)
            : allLabels.map((label) => (
                <SidebarMenuItem key={label.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      handleLabelClick(label.name);
                    }}
                    isActive={activeNavItem === label.name && !isEditingLabels}
                    tooltip={label.name}
                    className={cn(
                      "justify-start",
                      "bg-background!",
                      label.name === currentLabel &&
                        !isEditingLabels &&
                        " bg-foreground! text-background!",
                    )}
                    size="lg"
                  >
                    <Tag className="size-5" />
                    <span className="group-data-[collapsible=icon]:hidden truncate flex-1">
                      {label.name}
                    </span>
                    {isEditingLabels && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 opacity-60 space-y-10 hover:opacity-100 group-data-[collapsible=icon]:hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLabel(label.id);
                        }}
                      >
                        <Trash2 className="size-5  text-red-700" />
                      </Button>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="bg-background">
        {isPending ? (
          <NavItemSkeleton>
            <div className="rounded-full border size-8" />
          </NavItemSkeleton>
        ) : (
          <SidebarFooterMenu
            name={data?.user.name ?? "User name"}
            image={data?.user.image ?? ""}
            email={data?.user.email as string}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
