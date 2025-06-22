import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'
import './App.css'

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '2rem',
      backgroundColor: 'var(--tt-bg-color, #ffffff)',
      color: 'var(--tt-text-color, #000000)'
    }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Kite Markdown Editor</h1>
      <SimpleEditor />
    </div>
  )
}

export default App
