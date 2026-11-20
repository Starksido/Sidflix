import { AccountForm } from "@/components/account-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Your account · Sidflix" };
export default function AccountPage() {
  return <><SiteHeader /><main className="account-page flex flex-1 items-center justify-center px-5 py-16"><AccountForm /></main><SiteFooter /></>;
}
