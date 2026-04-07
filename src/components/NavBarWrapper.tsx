"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "./NavBar";
import { useAuthContext } from "./AuthProvider";

export const NavBarWrapper: React.FC = () => {
  const { user } = useAuthContext();
  const pathname = usePathname();

  // Hide nav when not logged in or on the landing page
  if (!user || pathname === "/") return null;

  return <NavBar />;
};
