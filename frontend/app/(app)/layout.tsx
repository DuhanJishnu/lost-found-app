import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Navbar } from "@/components/layout/navbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!(session?.user?.googleId ?? session?.user?.userId)) {
    redirect("/");
  }

  return (
    <>
      <Navbar />
      <MobileHeader />
      {children}
      <BottomTabBar />
    </>
  );
}
