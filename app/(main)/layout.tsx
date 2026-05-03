import NavRail from "@/components/nav-rail";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <NavRail />
      <main className="flex-1 ml-16">
        {children}
      </main>
    </div>
  );
}