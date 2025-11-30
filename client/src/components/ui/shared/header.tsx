import { useState } from "react";
import { ChevronDown, Menu, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { NotificationsPopover } from "@/components/notifications";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Header({ mobileMenuOpen, setMobileMenuOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/auth");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "?";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  return (
    <header className="bg-background dark:bg-card border-b border-border dark:border-sidebar-border sticky top-0 z-40 shadow-sm dark:shadow-md shadow-primary/5 dark:shadow-primary/10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleMobileMenu}
            className="md:hidden text-primary hover:text-primary transition-colors hover:bg-primary/10 dark:hover:bg-sidebar-accent rounded-md p-1"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-primary font-bold text-xl animate-cyan-pulse">
              Perceive AI
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <NotificationsPopover />
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 focus:outline-none hover:bg-accent dark:hover:bg-sidebar-accent border border-transparent hover:border-primary/20 dark:hover:border-sidebar-accent">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-md hover:shadow-lg transition-all hover:scale-105 animate-cyan-glow">
                  <span className="text-xs font-semibold">{getInitials()}</span>
                </div>
                <span className="hidden md:block text-sm font-medium text-foreground dark:text-sidebar-foreground">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDown className="h-4 w-4 text-primary/70 dark:text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card dark:bg-sidebar border border-border dark:border-sidebar-border shadow-lg">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="hover:bg-accent dark:hover:bg-sidebar-accent focus:bg-accent dark:focus:bg-sidebar-accent">
                <User className="mr-2 h-4 w-4 text-primary" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border dark:bg-sidebar-border" />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="hover:bg-destructive/10 dark:hover:bg-destructive/20 focus:bg-destructive/10 dark:focus:bg-destructive/20">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
