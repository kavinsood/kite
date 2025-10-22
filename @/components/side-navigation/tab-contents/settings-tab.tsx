export function SettingsTab() {
  return (
    <div className="settings-tab">
      <h3 className="settings-tab-title">Settings</h3>
      <div className="settings-tab-content">
        <div className="settings-tab-section">
          <h4 className="settings-tab-section-title">Editor</h4>
          <div className="settings-tab-option">
            <label className="settings-tab-label">
              <input type="checkbox" defaultChecked />
              <span>Auto-save</span>
            </label>
          </div>
          <div className="settings-tab-option">
            <label className="settings-tab-label">
              <input type="checkbox" />
              <span>Focus mode</span>
            </label>
          </div>
          <div className="settings-tab-option">
            <label className="settings-tab-label">
              <input type="checkbox" defaultChecked />
              <span>Spell check</span>
            </label>
          </div>
        </div>
        
        <div className="settings-tab-section">
          <h4 className="settings-tab-section-title">Appearance</h4>
          <div className="settings-tab-option">
            <label className="settings-tab-label">
              <span>Theme</span>
              <select className="settings-tab-select">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </label>
          </div>
          <div className="settings-tab-option">
            <label className="settings-tab-label">
              <span>Font size</span>
              <select className="settings-tab-select">
                <option value="small">Small</option>
                <option value="medium" selected>Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}