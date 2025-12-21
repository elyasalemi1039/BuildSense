import {
  Building2,
  CheckSquare,
  ClipboardCheck,
  FileText,
  HelpCircle,
  type LucideIcon,
  Map,
  Settings,
  Sparkles,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboard",
    items: [
      {
        title: "Overview",
        url: "/dashboard/default",
        icon: Building2,
      },
    ],
  },
  {
    id: 2,
    label: "Compliance",
    items: [
      {
        title: "Projects",
        url: "/dashboard/coming-soon",
        icon: Building2,
        comingSoon: true,
      },
      {
        title: "NCC Search",
        url: "/dashboard/coming-soon",
        icon: FileText,
        comingSoon: true,
      },
      {
        title: "Checklists",
        url: "/dashboard/coming-soon",
        icon: CheckSquare,
        comingSoon: true,
      },
      {
        title: "Inspections",
        url: "/dashboard/coming-soon",
        icon: ClipboardCheck,
        comingSoon: true,
      },
      {
        title: "Zone Lookup",
        url: "/dashboard/coming-soon",
        icon: Map,
        comingSoon: true,
      },
    ],
  },
  {
    id: 3,
    label: "AI Tools",
    items: [
      {
        title: "AI Copilot",
        url: "/dashboard/coming-soon",
        icon: Sparkles,
        comingSoon: true,
        isNew: true,
      },
    ],
  },
  {
    id: 4,
    label: "Account",
    items: [
      {
        title: "Settings",
        url: "/dashboard/coming-soon",
        icon: Settings,
        comingSoon: true,
      },
      {
        title: "Help",
        url: "/dashboard/coming-soon",
        icon: HelpCircle,
        comingSoon: true,
      },
    ],
  },
];
