import { Suspense } from "react";
import Header from "@/components/header";
import MainSidebar from "@/components/main-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <SidebarProvider>
        <TooltipProvider>
          <Header />
          <div className="flex w-full  flex-col h-screen bg-background text-foreground">
            <div className="flex flex-1 overflow-hidden">
              <Suspense fallback={null}>
                <MainSidebar />
              </Suspense>
              <SidebarInset className="flex flex-col flex-1 overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 mt-20 md:p-6 lg:p-8">
                  {children}
                </main>
              </SidebarInset>
            </div>
          </div>
        </TooltipProvider>
      </SidebarProvider>
  );
}
