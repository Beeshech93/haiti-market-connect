import { Footer } from "@/components/Footer";
import { Header, MobileTabBar } from "@/components/Header";

export function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}
