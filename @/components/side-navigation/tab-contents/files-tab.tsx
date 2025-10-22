export function FilesTab() {
  return (
    <div className="files-tab">
      <h3 className="files-tab-title">Files</h3>
      <div className="files-tab-content">
        <div className="files-tab-list">
          <div className="files-tab-item">
            <div className="files-tab-item-icon">📄</div>
            <div className="files-tab-item-info">
              <span className="files-tab-item-name">document.md</span>
              <span className="files-tab-item-size">2.4 KB</span>
            </div>
          </div>
          <div className="files-tab-item">
            <div className="files-tab-item-icon">📊</div>
            <div className="files-tab-item-info">
              <span className="files-tab-item-name">presentation.pptx</span>
              <span className="files-tab-item-size">1.2 MB</span>
            </div>
          </div>
          <div className="files-tab-item">
            <div className="files-tab-item-icon">🖼️</div>
            <div className="files-tab-item-info">
              <span className="files-tab-item-name">diagram.png</span>
              <span className="files-tab-item-size">456 KB</span>
            </div>
          </div>
        </div>
        <button className="files-tab-upload">
          + Upload File
        </button>
      </div>
    </div>
  )
}