import * as React from "react"
import { cn } from "@/lib/tiptap-utils"

interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  content?: React.ReactNode
}

interface SideNavigationProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function SideNavigation({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className 
}: SideNavigationProps) {
  return (
    <div className={cn("side-navigation", className)}>
      <div className="side-navigation-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "side-navigation-tab",
              activeTab === tab.id && "side-navigation-tab-active"
            )}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.icon && (
              <span className="side-navigation-tab-icon">
                {tab.icon}
              </span>
            )}
            <span className="side-navigation-tab-label">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

interface SideNavigationContentProps {
  tabs: TabItem[]
  activeTab: string
  className?: string
}

export function SideNavigationContent({ 
  tabs, 
  activeTab, 
  className 
}: SideNavigationContentProps) {
  const activeTabData = tabs.find(tab => tab.id === activeTab)
  
  if (!activeTabData?.content) {
    return null
  }

  return (
    <div className={cn("side-navigation-content", className)}>
      {activeTabData.content}
    </div>
  )
}