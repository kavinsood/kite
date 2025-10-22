import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'
import { SideNavigation, SideNavigationContent } from '@/components/side-navigation/side-navigation'
import { MobileToggle } from '@/components/side-navigation/mobile-toggle'
import { OutlineTab } from '@/components/side-navigation/tab-contents/outline-tab'
import { NotesTab } from '@/components/side-navigation/tab-contents/notes-tab'
import { FilesTab } from '@/components/side-navigation/tab-contents/files-tab'
import { SettingsTab } from '@/components/side-navigation/tab-contents/settings-tab'
import { OutlineIcon } from '@/components/side-navigation/icons/outline-icon'
import { NotesIcon } from '@/components/side-navigation/icons/notes-icon'
import { FilesIcon } from '@/components/side-navigation/icons/files-icon'
import { SettingsIcon } from '@/components/side-navigation/icons/settings-icon'
import { useState } from 'react'
import './App.css'
import '@/components/side-navigation/side-navigation.scss'
import '@/components/side-navigation/mobile-toggle.scss'
import '@/components/side-navigation/tab-contents/tab-contents.scss'

function App() {
  const [activeTab, setActiveTab] = useState('outline')
  const [isSideNavOpen, setIsSideNavOpen] = useState(false)

  const tabs = [
    {
      id: 'outline',
      label: 'Outline',
      icon: <OutlineIcon />,
      content: <OutlineTab />
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: <NotesIcon />,
      content: <NotesTab />
    },
    {
      id: 'files',
      label: 'Files',
      icon: <FilesIcon />,
      content: <FilesTab />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      content: <SettingsTab />
    }
  ]

  return (
    <div className="app-container">
      <MobileToggle
        isOpen={isSideNavOpen}
        onToggle={() => setIsSideNavOpen(!isSideNavOpen)}
      />
      
      {isSideNavOpen && (
        <div 
          className="side-navigation-overlay"
          onClick={() => setIsSideNavOpen(false)}
        />
      )}
      
      <SideNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId)
          setIsSideNavOpen(false) // Close on mobile after selection
        }}
        className={isSideNavOpen ? 'side-navigation-open' : ''}
      />
      
      <div className="app-main-content">
        <SimpleEditor />
      </div>
      
      <SideNavigationContent
        tabs={tabs}
        activeTab={activeTab}
      />
    </div>
  )
}

export default App
