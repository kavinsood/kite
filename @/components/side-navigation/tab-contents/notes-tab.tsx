export function NotesTab() {
  return (
    <div className="notes-tab">
      <h3 className="notes-tab-title">Quick Notes</h3>
      <div className="notes-tab-content">
        <div className="notes-tab-list">
          <div className="notes-tab-item">
            <div className="notes-tab-item-header">
              <span className="notes-tab-item-title">Meeting Notes</span>
              <span className="notes-tab-item-time">2 hours ago</span>
            </div>
            <p className="notes-tab-item-preview">
              Discussed project timeline and deliverables...
            </p>
          </div>
          <div className="notes-tab-item">
            <div className="notes-tab-item-header">
              <span className="notes-tab-item-title">Ideas</span>
              <span className="notes-tab-item-time">Yesterday</span>
            </div>
            <p className="notes-tab-item-preview">
              New feature ideas for the next sprint...
            </p>
          </div>
          <div className="notes-tab-item">
            <div className="notes-tab-item-header">
              <span className="notes-tab-item-title">Research</span>
              <span className="notes-tab-item-time">3 days ago</span>
            </div>
            <p className="notes-tab-item-preview">
              Market analysis and competitor research...
            </p>
          </div>
        </div>
        <button className="notes-tab-add">
          + Add Note
        </button>
      </div>
    </div>
  )
}