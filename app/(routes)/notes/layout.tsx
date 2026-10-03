
import RootLayout from "@/components/Layouts/root-layout";


export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
   <RootLayout>{children}</RootLayout>
  );
}
