"use client";

import { NavBar } from "./NavBar";
import { useAuthContext } from "./AuthProvider";

export const NavBarWrapper: React.FC = () => {
  const { user } = useAuthContext();
  if (!user) return null; // Hide nav when not logged in
  return <NavBar />;
};
