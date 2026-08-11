import type { Metadata } from "next";
import QuickLinkClient from "./QuickLinkClient";

export const metadata: Metadata = {
  title: "Short Links | jadren tools",
  description: "Create and manage koi.ci short links",
};

export default function QuickLinkPage() {
  return <QuickLinkClient />;
}

