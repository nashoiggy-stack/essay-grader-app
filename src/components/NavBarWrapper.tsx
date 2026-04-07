"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "./NavBar";
import { useAuthContext } from "./AuthProvider";

export const NavBarWrapper: React.FC = () => {
  const { user } = useAuthContext();
  const pathname = usePathname();

  if (!user) return null;
  if (pathname === "/") return null; // Hide nav on landing page

  return <NavBar />;
};
