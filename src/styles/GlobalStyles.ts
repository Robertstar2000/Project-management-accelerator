

export const GlobalStyles = `
  :root {
    --background-color: #0a0a1a;
    --primary-text: #e0e0e0;
    --secondary-text: #a0a0b0;
    --accent-color: #00f2ff;
    --card-background: #1a1a2a;
    --border-color: #33334a;
    --success-color: #00ffaa;
    --error-color: #ff4d4d;
    --locked-color: #55556a;
    --inprogress-color: #ffaa00;
    --status-red: #ff4d4d;
    --status-amber: #ffaa00;
    --status-green: #00ffaa;
    --task-todo-color: #55556a;
    --task-inprogress-color: #00aaff;
    --task-review-color: #ffaa00;
    --task-done-color: #00ffaa;
  }

  /* Custom MS Windows-style Scrollbar */
  ::-webkit-scrollbar {
    width: 17px;
    height: 17px;
  }

  ::-webkit-scrollbar-track {
    background-color: var(--background-color);
  }

  ::-webkit-scrollbar-thumb {
    background-color: #555;
    border: 1px solid var(--background-color);
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background-color: #666;
  }
  
  ::-webkit-scrollbar-corner {
    background-color: var(--background-color);
  }

  ::-webkit-scrollbar-button:single-button {
    background-color: var(--card-background);
    display: block;
    border-style: solid;
    border-color: var(--border-color);
    border-width: 1px;
    background-size: 10px;
    background-repeat: no-repeat;
    background-position: center;
    height: 17px;
    width: 17px;
  }
  
  ::-webkit-scrollbar-button:single-button:hover {
    background-color: #2a2a3a;
  }

  ::-webkit-scrollbar-button:single-button:vertical:decrement {
    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgZmlsbD0iJTIzZTBjMGUwIj48cGF0aCBkPSJNNiAwTDYgMEwzIDZMMTIgNkw5IDB6IiB0cmFuc2Zvcm09InJvdGF0ZSgxODAgNiA0LjUpIHNjYWxlKDAuOCkiLz48L3N2Zz4=');
    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgZmlsbD0iJTIzZTBjMGUwIj48cGF0aCBkPSJNNiAwbDYgNkgweiIvPjwvc3ZnPg==');
  }

  ::-webkit-scrollbar-button:single-button:vertical:increment {
    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgZmlsbD0iJTIzZTBjMGUwIj48cGF0aCBkPSJNNiAxMkwwIDZoMTJ6Ii8+PC9zdmc+');
  }
  /* End Custom Scrollbar */


  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    overflow-y: scroll;
    /* For Firefox */
    scrollbar-width: thin;
    scrollbar-color: #555 var(--background-color);
  }

  html, body {
    background-color: var(--background-color);
    color: var(--primary-text);
    font-family: 'Space Grotesk', sans-serif;
    line-height: 1.6;
    scroll-behavior: smooth;
  }

  #root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  main {
    flex-grow: 1;
    max-width: 1200px;
    width: 90%;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 4rem;
  }

  a {
    color: var(--accent-color);
    text-decoration: none;
  }
  
  a:hover {
    text-decoration: underline;
  }

  h1, h2, h3, h4 {
    font-weight: 700;
    letter-spacing: 1px;
  }

  .button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--accent-color);
    border-radius: 4px;
    background-color: transparent;
    color: var(--accent-color);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }
  
  .button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: var(--secondary-text);
    color: var(--secondary-text);
  }

  .button:hover:not([disabled]), .button:focus:not([disabled]) {
    background-color: var(--accent-color);
    color: var(--background-color);
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
  }
  
  .button-primary {
    background-color: var(--accent-color);
    color: var(--background-color);
  }

  .button-primary:hover:not([disabled]), .button-primary:focus:not([disabled]) {
    background-color: transparent;
    color: var(--accent-color);
  }
  
  .button-small {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .button-danger {
    border-color: var(--error-color);
    color: var(--error-color);
  }
  .button-danger:hover:not([disabled]) {
    background-color: var(--error-color);
    color: var(--background-color);
  }
  
  .button-close {
    background: none;
    border: none;
    color: var(--secondary-text);
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
  }

  .section-title {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 2rem;
    color: #fff;
    text-shadow: 0 0 10px var(--accent-color);
  }
  
  .subsection-title {
    font-size: 1.8rem;
    color: var(--primary-text);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .chip {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: bold;
  }
  .chip-green { background-color: var(--status-green); color: var(--background-color); }
  .chip-amber { background-color: var(--status-amber); color: var(--background-color); }
  .chip-red { background-color: var(--status-red); color: var(--background-color); }

  /* Hero Section Features */
  .features-container {
      margin-top: 5rem;
  }

  .features-title {
      text-align: center;
      font-size: 2rem;
      margin-bottom: 2.5rem;
  }

  .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 2rem;
  }

  .feature-card {
      background-color: var(--card-background);
      padding: 2rem 1.5rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      text-align: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 0 15px rgba(0, 242, 255, 0.1);
  }
  
  .feature-card .icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: var(--accent-color);
  }
  
  .feature-card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
  }

  .feature-card p {
      font-size: 0.95rem;
      color: var(--secondary-text);
      line-height: 1.5;
  }
  
  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: var(--card-background);
    padding: 2.5rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    width: 90%;
    max-width: 500px;
    box-shadow: 0 0 20px rgba(0, 242, 255, 0.2);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
  }

  .modal-content h2 {
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .modal-warning-text {
      background-color: rgba(255, 77, 77, 0.1);
      border: 1px solid var(--error-color);
      color: var(--primary-text);
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      line-height: 1.5;
  }

  .ai-warning-box {
    background-color: rgba(255, 170, 0, 0.1);
    border: 1px solid var(--inprogress-color);
    color: var(--inprogress-color);
    padding: 1.5rem;
    border-radius: 8px;
    line-height: 1.6;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--secondary-text);
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 0.75rem;
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--primary-text);
    font-size: 1rem;
    font-family: 'Space Grotesk', sans-serif;
  }
  
  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: 1px solid var(--accent-color);
    border-color: var(--accent-color);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2.5rem;
  }
  
  /* Project Manager Modal */
  .project-manager-modal {
    max-width: 600px;
  }
  
  .modal-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 2rem;
    flex-shrink: 0;
  }
  .modal-tabs button {
    padding: 0.75rem 1.5rem;
    border: none;
    background: transparent;
    color: var(--secondary-text);
    font-size: 1rem;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    margin-bottom: -1px;
    transition: color 0.2s ease, border-color 0.2s ease;
  }
  .modal-tabs button:hover:not([disabled]) {
    color: var(--primary-text);
  }
  .modal-tabs button.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
  }

  .project-list-section, .create-project-section {
    flex: 1; /* Make content areas flexible */
    min-height: 0; /* Crucial for allowing flex children to shrink and scroll */
    display: flex;
    flex-direction: column;
  }

  .project-list-section {
    overflow-y: auto;
    padding-right: 1rem;
  }

  .create-project-section form {
    flex: 1; /* Make form grow to fill space */
    overflow-y: auto; /* Make form scrollable */
    padding-right: 1rem; /* Add space for scrollbar */
  }
  
  .create-project-section h3 {
    margin-bottom: 1.5rem;
    color: var(--accent-color);
    font-size: 1.2rem;
    text-align: left;
  }
  
  .project-selection-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .project-selection-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-radius: 4px;
    background-color: var(--background-color);
  }
  
  .project-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .project-info span {
    font-size: 0.8rem;
    color: var(--secondary-text);
    text-transform: capitalize;
  }
  
  .project-actions {
    display: flex;
    gap: 0.75rem;
  }

  .mode-switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    background-color: var(--background-color);
    padding: 0.5rem;
    border-radius: 6px;
  }
  .mode-switch button {
    padding: 1rem;
    border: 1px solid var(--border-color);
    background: transparent;
    color: var(--secondary-text);
    cursor: pointer;
    border-radius: 4px;
    text-align: left;
    transition: all 0.2s ease;
    font-size: 1rem;
    line-height: 1.3;
  }
  .mode-switch button span {
    display: block;
    font-size: 0.8rem;
    font-weight: 400;
    margin-top: 0.25rem;
  }
  .mode-switch button:hover {
    border-color: var(--accent-color);
    color: var(--primary-text);
  }
  .mode-switch button.active {
    border-color: var(--accent-color);
    background-color: rgba(0, 242, 255, 0.1);
    color: var(--accent-color);
    box-shadow: 0 0 10px rgba(0, 242, 255, 0.1);
  }
  .mode-switch button.active span {
    color: var(--secondary-text);
  }

  .template-selection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .template-card {
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .template-card:hover {
    border-color: var(--accent-color);
    background-color: rgba(0, 242, 255, 0.05);
  }
  .template-card.selected {
    border-color: var(--accent-color);
    background-color: rgba(0, 242, 255, 0.1);
    box-shadow: 0 0 10px rgba(0, 242, 255, 0.1);
  }
  .template-card h4 {
    font-size: 1rem;
    color: var(--primary-text);
    margin-bottom: 0.5rem;
  }
  .template-card p {
    font-size: 0.8rem;
    color: var(--secondary-text);
  }
  
  /* Help FAB */
  .help-fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: var(--accent-color);
    color: var(--background-color);
    border: none;
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 242, 255, 0.3);
    z-index: 1001;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .help-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 15px rgba(0, 242, 255, 0.4);
  }
  
  .back-to-top-fab {
    position: fixed;
    bottom: 2rem;
    left: 2rem;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: var(--accent-color);
    color: var(--background-color);
    border: none;
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 242, 255, 0.3);
    z-index: 1001;
    transition: transform 0.3s ease, opacity 0.3s ease;
    opacity: 0;
    transform: translateY(100px);
  }
  .back-to-top-fab.visible {
      opacity: 1;
      transform: translateY(0);
  }

  /* Help Modal */
  .help-modal-content {
      max-width: 800px;
      height: 80vh;
  }
  .help-modal-body {
      flex-grow: 1;
      overflow-y: auto;
      padding-right: 1.5rem; /* For scrollbar */
  }
  .help-modal-body h1, .help-modal-body h2, .help-modal-body h3 {
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      color: var(--accent-color);
  }
  .help-modal-body ul, .help-modal-body ol {
      margin-left: 1.5rem;
      margin-bottom: 1rem;
  }
  .help-modal-body li {
      margin-bottom: 0.5rem;
  }
  .help-modal-body code {
      background-color: var(--background-color);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.9rem;
  }
  .help-modal-body hr {
      border: 0;
      border-top: 1px solid var(--border-color);
      margin: 2rem 0;
  }
  
  /* Landing Page Project List */
  .project-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  .project-card-container {
    position: relative;
  }
  .project-card {
    background-color: var(--card-background);
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .project-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 0 15px rgba(0, 242, 255, 0.1);
  }
  .project-card h3 {
    margin-bottom: 0.5rem;
  }
  .project-card p {
    color: var(--secondary-text);
  }
  .delete-project-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .project-card-container:hover .delete-project-button {
    opacity: 1;
  }
  .no-projects {
      text-align: center;
      padding: 3rem;
      background: var(--card-background);
      border-radius: 8px;
      border: 1px dashed var(--border-color);
  }

  /* Landing Page Instructions */
  .instructions-list {
    background-color: var(--card-background);
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }
  .instructions-list h2 {
    margin-bottom: 1.5rem;
    color: var(--accent-color);
  }
  .instructions-list ul {
    list-style: none;
    padding-left: 0;
  }
  .instructions-list li {
    padding-left: 2rem;
    position: relative;
    margin-bottom: 1rem;
  }
  .instructions-list li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--accent-color);
    font-weight: bold;
    font-size: 1.2rem;
  }

  /* Dashboard Header */
  .dashboard-header {
    text-align: center;
    margin-bottom: 2rem;
    position: relative;
  }
  .dashboard-header .back-button {
    position: absolute;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
  }
  .dashboard-header h1 {
      font-size: 2.5rem;
  }
  .dashboard-header p {
      color: var(--secondary-text);
      font-size: 1.2rem;
  }
  
  .dashboard-nav {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 1rem;
    flex-wrap: wrap;
  }
  .dashboard-nav button {
    border: none;
    background: transparent;
    padding: 0.5rem 1rem;
  }
  .dashboard-nav button.active {
    background: var(--accent-color);
    color: var(--background-color);
  }
  
  /* General Tool Card */
  .tool-card {
      background-color: var(--card-background);
      padding: 2rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
  }
  .tool-grid {
      display: grid;
      gap: 1.5rem;
  }
  
  /* Status Message (Loading/Error) */
  .status-message {
      padding: 1.5rem;
      border-radius: 4px;
      text-align: center;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
  }
  .status-message.error {
      background-color: rgba(255, 77, 77, 0.1);
      border: 1px solid var(--error-color);
      color: var(--error-color);
  }
  .status-message.loading {
      background-color: rgba(0, 242, 255, 0.1);
      border: 1px solid var(--accent-color);
      color: var(--accent-color);
  }
  
  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(0, 242, 255, 0.3);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Phase Card styles */
  .phase-card {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 1rem;
    transition: box-shadow 0.2s ease;
  }
  .phase-card:not(.locked):hover {
    box-shadow: 0 0 10px rgba(0, 242, 255, 0.1);
  }

  .phase-header {
    padding: 1rem 1.5rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .phase-card.locked .phase-header {
    cursor: not-allowed;
  }

  .phase-status {
    text-transform: capitalize;
    font-weight: bold;
    padding: 0.3rem 0.8rem;
    border-radius: 1rem;
    font-size: 0.9rem;
  }
  .phase-status.locked { color: var(--locked-color); }
  .phase-status.todo { color: var(--inprogress-color); }
  .phase-status.completed { color: var(--success-color); }
  .phase-status.failed { color: var(--error-color); }
  
  .lock-reason {
    font-size: 0.8rem;
    color: var(--locked-color);
    margin-top: 0.5rem;
  }

  .phase-content {
    padding: 0 1.5rem 1.5rem;
    border-top: 1px solid var(--border-color);
  }
  .phase-content textarea {
    width: 100%;
    min-height: 200px;
    resize: vertical;
    margin: 1.5rem 0;
  }
  .phase-content .display-content {
    background-color: var(--background-color);
    padding: 1rem;
    border-radius: 4px;
    margin: 1.5rem 0;
    max-height: 400px;
    overflow-y: auto;
  }
  .display-content h1, .display-content h2, .display-content h3 { color: var(--accent-color); margin: 1rem 0 0.5rem; }
  .display-content p { margin-bottom: 0.5rem; }
  .display-content ul, .display-content ol { margin-left: 1.5rem; margin-bottom: 1rem; }
  .display-content code { background-color: var(--card-background); padding: 0.2rem 0.4rem; border-radius: 4px; }
  .display-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  .display-content th, .display-content td { border: 1px solid var(--border-color); padding: 0.5rem; }
  .display-content th { background: var(--card-background); }

  .phase-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .attachments-section {
    margin-top: 2rem;
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
  }
  .attachment-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .attachment-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--background-color);
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
  
  /* Document Center Table */
  .document-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;
  }
  .document-table th, .document-table td {
    border: 1px solid var(--border-color);
    padding: 0.75rem 1rem;
    text-align: left;
  }
  .document-table th {
    background: var(--card-background);
  }
  .document-status-select {
    width: 100%;
    border: none;
    background: transparent;
    font-weight: bold;
    padding: 0.5rem;
    border-radius: 4px;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    cursor: pointer;
  }
  .document-status-select.chip-green { background: var(--status-green); color: var(--background-color); }
  .document-status-select.chip-amber { background: var(--status-amber); color: var(--background-color); }
  .document-status-select.chip-red { background: var(--status-red); color: var(--background-color); }

  .upload-dropzone {
      margin-top: 2rem;
      border: 2px dashed var(--border-color);
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
  }
  .upload-dropzone:hover {
      border-color: var(--accent-color);
  }

  /* Project Tracking Views */
  .tracking-view-tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 1rem;
  }
  
  /* Task List Table */
  .task-list-table {
    width: 100%;
    border-collapse: collapse;
    overflow-x: auto;
    display: block;
    white-space: nowrap;
  }
  .task-list-table th, .task-list-table td {
    border: 1px solid var(--border-color);
    padding: 0.75rem 1rem;
    text-align: left;
  }
  .task-list-table tbody tr {
    cursor: pointer;
  }
  .task-list-table tbody tr:hover {
    background-color: var(--card-background);
  }
  .task-list-table th { background: var(--card-background); }
  .task-list-table input, .task-list-table select {
    background: transparent;
    border: none;
    color: var(--primary-text);
    padding: 0.25rem;
    width: 100%;
    min-width: 120px;
    cursor: initial;
  }
  .task-list-table input[type="date"] { min-width: 150px; }
  .dependency-select {
    min-height: 60px;
    background: var(--background-color) !important;
    border: 1px solid var(--border-color) !important;
  }
  .task-date-error {
    color: var(--error-color);
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }
  .task-row-overdue {
    background-color: rgba(255, 77, 77, 0.1);
    box-shadow: -4px 0 0 0 var(--error-color) inset;
  }
  .task-row-overdue:hover {
    background-color: rgba(255, 77, 77, 0.2);
  }

  /* Gantt Chart */
  .gantt-container {
      position: relative;
      overflow-x: auto;
      padding-bottom: 1rem; /* Space for dependency lines */
  }
  .gantt-grid {
      display: grid;
      min-width: 1200px; /* Ensure there's space to scroll */
  }
  .gantt-header {
      display: contents;
  }
  .gantt-date {
      text-align: center;
      padding: 0.5rem 0;
      border-right: 1px solid var(--border-color);
      border-bottom: 1px solid var(--border-color);
      font-size: 0.8rem;
      color: var(--secondary-text);
  }
  .gantt-sprint-label, .gantt-task-row {
      display: contents;
  }
  .gantt-sprint-label {
      grid-column: 1 / -1;
      padding: 0.5rem;
      background: var(--card-background);
      font-weight: bold;
      position: sticky;
      left: 0;
      z-index: 1;
      border-bottom: 1px solid var(--border-color);
  }
  .gantt-task-bar {
      margin: 4px 0;
      padding: 0.5rem;
      border-radius: 4px;
      color: var(--primary-text);
      font-size: 0.8rem;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;
      position: relative;
  }
  .gantt-task-bar.subcontracted::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
          -45deg,
          rgba(255,255,255,0.05),
          rgba(255,255,255,0.05) 5px,
          transparent 5px,
          transparent 10px
      );
  }
  .gantt-task-bar.task-bar-todo { background-color: var(--task-todo-color); }
  .gantt-task-bar.task-bar-inprogress { background-color: var(--task-inprogress-color); }
  .gantt-task-bar.task-bar-review { background-color: var(--task-review-color); }
  .gantt-task-bar.task-bar-done { background-color: var(--task-done-color); color: var(--background-color); }
  .gantt-task-bar.overdue {
    box-shadow: 0 0 0 2px var(--error-color) inset;
  }
  .gantt-task-bar.blocked {
    background-image: repeating-linear-gradient(
        45deg,
        rgba(255, 77, 77, 0.4),
        rgba(255, 77, 77, 0.4) 5px,
        transparent 5px,
        transparent 10px
    );
  }
  .gantt-dependency-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
  }
  .gantt-dependency-line {
      stroke: var(--accent-color);
      stroke-width: 1.5;
      fill: none;
  }
  .gantt-dependency-arrow {
      fill: var(--accent-color);
  }

  /* Kanban Board */
  .kanban-board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
  .kanban-column {
    background-color: var(--background-color);
    padding: 1rem;
    border-radius: 8px;
    height: 70vh;
    overflow-y: auto;
  }
  .kanban-column h4 {
    margin-bottom: 1rem;
    text-align: center;
    color: var(--secondary-text);
  }
  .kanban-card {
    background-color: var(--card-background);
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    cursor: pointer;
    position: relative;
  }
  .kanban-card.overdue {
    box-shadow: 0 0 8px 1px var(--error-color);
  }
  .kanban-card.todo { border-left: 5px solid var(--task-todo-color); }
  .kanban-card.inprogress { border-left: 5px solid var(--task-inprogress-color); }
  .kanban-card.review { border-left: 5px solid var(--task-review-color); }
  .kanban-card.done { border-left: 5px solid var(--task-done-color); opacity: 0.7; }
  .subcontractor-label {
      position: absolute;
      top: 5px;
      right: 5px;
      font-size: 0.7rem;
      background: var(--locked-color);
      color: var(--primary-text);
      padding: 2px 5px;
      border-radius: 3px;
  }
  .kanban-status-select {
    background: transparent;
    border: none;
    color: var(--secondary-text);
    font-size: 0.8rem;
    cursor: pointer;
  }
  
  /* Milestones Table */
  .milestones-table {
    width: 100%;
    border-collapse: collapse;
  }
  .milestones-table th, .milestones-table td {
    border: 1px solid var(--border-color);
    padding: 0.75rem 1rem;
    text-align: left;
  }
  .milestones-table th { background: var(--card-background); }
  .milestone-planned-date { text-decoration: line-through; color: var(--secondary-text); }
  
  /* Revision Control */
  .impact-table {
    width: 100%;
    border-collapse: collapse;
  }
  .impact-table th, .impact-table td {
    border: 1px solid var(--border-color);
    padding: 0.75rem 1rem;
    text-align: left;
  }
  .impact-table th { background: var(--card-background); }
  .impact-positive { color: var(--error-color); }
  .impact-negative { color: var(--success-color); }
  
  /* Dashboard View */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
  }
  .kpi-card {
    background: var(--background-color);
    padding: 1.5rem;
    border-radius: 8px;
  }
  .kpi-card h4 {
    color: var(--secondary-text);
    font-size: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 400;
  }
  .kpi-card .value {
    font-size: 2rem;
    font-weight: bold;
  }
  .kpi-card .value.green { color: var(--status-green); }
  .kpi-card .value.amber { color: var(--status-amber); }
  .kpi-card .value.red { color: var(--status-red); }

  /* Financial Summary Card */
  .financial-summary-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .financial-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.95rem;
  }
  .financial-item span:first-child {
    color: var(--secondary-text);
  }
  .financial-item .value {
    font-weight: bold;
    font-size: 1.1rem;
  }
  .financial-item .value.green { color: var(--status-green); }
  .financial-item .value.red { color: var(--error-color); }
  .financial-summary-grid hr {
      border: 0;
      border-top: 1px solid var(--border-color);
      margin: 0.5rem 0;
  }

  .phase-tracker {
      display: flex;
      width: 100%;
      height: 20px;
      border-radius: 10px;
      overflow: hidden;
      background: var(--background-color);
  }
  .phase-tracker-segment {
      flex: 1;
      background: var(--locked-color);
      transition: background-color 0.3s ease;
  }
  .phase-tracker-segment.completed {
      background: var(--status-green);
  }
  .phase-tracker-segment.inprogress {
      background: var(--status-amber);
  }
  .swimlane { margin-bottom: 1.5rem; }
  .swimlane h4 { margin-bottom: 0.5rem; }
  .swimlane-content {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
  }
  .task-card {
      background: var(--background-color);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.8rem;
      white-space: nowrap;
  }
  
  /* Change Deployment Modal */
  .change-deployment-modal { max-width: 600px; }
  .deployment-progress { text-align: center; color: var(--secondary-text); margin-bottom: 1.5rem; }
  .deployment-step {
      background-color: var(--background-color);
      padding: 1.5rem;
      border-radius: 4px;
      border: 1px solid var(--border-color);
  }
  .deployment-step-action {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      color: var(--background-color);
      font-size: 0.9rem;
      margin-right: 0.5rem;
  }
  .deployment-step-action.add { background-color: var(--success-color); }
  .deployment-step-action.delete { background-color: var(--error-color); }
  .deployment-step-action.edit { background-color: var(--inprogress-color); }
  .deployment-step-target {
      font-weight: bold;
      font-size: 1.2rem;
      margin: 1rem 0;
  }

  /* Notification Bell */
  .notification-bell {
    position: relative;
    cursor: pointer;
  }
  .notification-badge {
    position: absolute;
    top: -5px;
    right: -10px;
    background-color: var(--error-color);
    color: white;
    border-radius: 50%;
    padding: 2px 6px;
    font-size: 0.7rem;
    font-weight: bold;
  }
  .notifications-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 1rem;
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    width: 350px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    z-index: 1010;
  }
  .notifications-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .notifications-list {
    max-height: 400px;
    overflow-y: auto;
  }
  .notification-item {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .notification-item:hover {
    background-color: var(--background-color);
  }
  .notification-item.unread {
    background-color: rgba(0, 242, 255, 0.05);
  }

  /* Task Detail Modal */
  .task-detail-modal {
    max-width: 900px;
    width: 95%;
    max-height: 90vh;
  }
  .task-detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  .task-detail-header h2 {
    margin: 0;
  }
  .task-detail-body {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    padding-top: 1.5rem;
    overflow-y: auto;
    flex-grow: 1;
  }
  .task-detail-main {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .task-detail-sidebar h4 {
    margin-bottom: 1rem;
  }
  .detail-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.9rem;
  }
  .detail-item span:first-child {
    color: var(--secondary-text);
  }
  .comments-section .comment-list {
    max-height: 250px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .comment {
    padding-bottom: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  .comment:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
  .comment-author { font-weight: bold; }
  .comment-text { margin: 0.5rem 0; }
  .comment-timestamp { font-size: 0.8rem; color: var(--secondary-text); }
  .comment-form { display: flex; flex-direction: column; gap: 0.5rem; }
  .comment-form button { align-self: flex-end; }
  
  @media (max-width: 768px) {
    main { width: 95%; gap: 2rem; }
    .dashboard-header .back-button {
      position: static;
      transform: none;
      margin-bottom: 1rem;
    }
    .kpi-card .value { font-size: 1.5rem; }
    .task-detail-body { grid-template-columns: 1fr; }
    .task-detail-sidebar { grid-row: 1; }
  }
`;
