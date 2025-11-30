import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  HelpCircle,
  FileText,
  Users,
  UserCog,
  Menu,
  GraduationCap,
  School,
  BookOpen,
  BookMarked,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("/dashboard");
  const { user } = useAuth();
  
  useEffect(() => {
    // Set the active tab based on the location
    setActiveTab(location);
  }, [location]);

  // Close sidebar on mobile after navigation
  const handleNavigation = () => {
    if (window.innerWidth < 768) {
      setMobileMenuOpen(false);
    }
  };

  const isTeacher = user?.role === "teacher";

  return (
    <aside 
      className={cn(
        "w-64 bg-background dark:bg-sidebar border-r border-border dark:border-sidebar-border fixed inset-y-0 left-0 z-30 transform md:translate-x-0 transition-transform duration-300 ease-in-out pt-16",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="h-full overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          <li className="px-3 py-2 text-xs font-semibold text-muted-foreground dark:text-sidebar-foreground uppercase">Main</li>
          <li>
            <div 
              className={cn(
                "flex items-center w-full px-3 py-2 text-foreground dark:text-sidebar-foreground hover:bg-accent dark:hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors",
                activeTab === "/dashboard" && "bg-primary dark:bg-sidebar-accent text-primary-foreground dark:text-sidebar-accent-foreground"
              )}
              onClick={() => {
                handleNavigation();
                setLocation("/dashboard");
              }}
            >
              <LayoutDashboard className="mr-3 text-lg text-muted-foreground dark:text-sidebar-foreground" />
              <span>Dashboard</span>
            </div>
          </li>
          
          {isTeacher && (
            <li>
              <div 
                className={cn(
                  "flex items-center w-full px-3 py-2 text-foreground dark:text-sidebar-foreground hover:bg-accent dark:hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors",
                  activeTab === "/question-bank" && "bg-primary dark:bg-sidebar-accent text-primary-foreground dark:text-sidebar-accent-foreground"
                )}
                onClick={() => {
                  handleNavigation();
                  setLocation("/question-bank");
                }}
              >
                <HelpCircle className="mr-3 text-lg text-muted-foreground dark:text-sidebar-foreground" />
                <span>Question Bank</span>
              </div>
            </li>
          )}
          
          <li>
            <div 
              className={cn(
                "flex items-center w-full px-3 py-2 text-foreground dark:text-sidebar-foreground hover:bg-accent dark:hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors",
                activeTab === "/quizzes" && "bg-primary dark:bg-sidebar-accent text-primary-foreground dark:text-sidebar-accent-foreground"
              )}
              onClick={() => {
                handleNavigation();
                setLocation("/quizzes");
              }}
            >
              <FileText className="mr-3 text-lg text-muted-foreground dark:text-sidebar-foreground" />
              <span>Quizzes</span>
            </div>
          </li>
          
          {!isTeacher && (
            <li>
              <div 
                className={cn(
                  "flex items-center w-full px-3 py-2 text-foreground dark:text-sidebar-foreground hover:bg-accent dark:hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors",
                  activeTab === "/practice-quiz" && "bg-primary dark:bg-sidebar-accent text-primary-foreground dark:text-sidebar-accent-foreground"
                )}
                onClick={() => {
                  handleNavigation();
                  setLocation("/practice-quiz");
                }}
              >
                <BookOpen className="mr-3 text-lg text-muted-foreground dark:text-sidebar-foreground" />
                <span>Practice Quiz</span>
              </div>
            </li>
          )}

          {/* Classes section for both teachers and students */}
          <li className="px-3 py-2 mt-6 text-xs font-semibold text-muted-foreground dark:text-sidebar-foreground uppercase">Classes</li>
          <li>
            <div 
              className={cn(
                "flex items-center w-full px-3 py-2 text-foreground dark:text-sidebar-foreground hover:bg-accent dark:hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors",
                activeTab === "/classes" && "bg-primary dark:bg-sidebar-accent text-primary-foreground dark:text-sidebar-accent-foreground"
              )}
              onClick={() => {
                handleNavigation();
                setLocation("/classes");
              }}
            >
              {isTeacher ? (
                <School className="mr-3 text-lg text-muted-foreground dark:text-sidebar-foreground" />
              ) : (
                <GraduationCap className="mr-3 text-lg text-muted-foreground dark:text-sidebar-foreground" />
              )}
              <span>{isTeacher ? "My Classes" : "Enrolled Classes"}</span>
            </div>
          </li>
          
          <li className="px-3 py-2 mt-6 text-xs font-semibold text-muted-foreground dark:text-sidebar-foreground uppercase">Profile</li>
          <li>
            <div 
              className={cn(
                "flex items-center w-full px-3 py-2 text-foreground dark:text-sidebar-foreground hover:bg-accent dark:hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors",
                activeTab === "/profile" && "bg-primary dark:bg-sidebar-accent text-primary-foreground dark:text-sidebar-accent-foreground"
              )}
              onClick={() => {
                handleNavigation();
                setLocation("/profile");
              }}
            >
              <UserCog className="mr-3 text-lg text-muted-foreground dark:text-sidebar-foreground" />
              <span>Profile</span>
            </div>
          </li>
        </ul>
      </div>
    </aside>
  );
}
