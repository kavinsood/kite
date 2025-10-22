export function OutlineTab() {
  return (
    <div className="outline-tab">
      <h3 className="outline-tab-title">Document Outline</h3>
      <div className="outline-tab-content">
        <p className="outline-tab-placeholder">
          Document structure will appear here as you add headings.
        </p>
        <div className="outline-tab-list">
          <div className="outline-tab-item">
            <span className="outline-tab-item-level">H1</span>
            <span className="outline-tab-item-text">Introduction</span>
          </div>
          <div className="outline-tab-item">
            <span className="outline-tab-item-level">H2</span>
            <span className="outline-tab-item-text">Getting Started</span>
          </div>
          <div className="outline-tab-item outline-tab-item-nested">
            <span className="outline-tab-item-level">H3</span>
            <span className="outline-tab-item-text">Installation</span>
          </div>
          <div className="outline-tab-item outline-tab-item-nested">
            <span className="outline-tab-item-level">H3</span>
            <span className="outline-tab-item-text">Configuration</span>
          </div>
        </div>
      </div>
    </div>
  )
}