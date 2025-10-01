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

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
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
    margin-bottom: 0;
    border-top: none;
    padding-top: 0;
  }
  
  .create-project-section h3 {
    margin-bottom: 1.5rem;
    color: var(--accent-color);
    font-size: 1.2rem;
    text-align: left;
  }
  
  .project-selection-list {
    list-style: none;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 1rem;
    margin-right: -1rem;
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
  }
  
  .project-actions {
    display: flex;
    gap: 0.75rem;
  }

  /* Project List Styles */
  .project-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .project-card {
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    cursor: pointer;
  }

  .project-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 0 15px rgba(0, 242, 255, 0.15);
    border-color: var(--accent-color);
  }

  .project-card[aria-disabled="true"] {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .project-card[aria-disabled="true"]:hover {
    transform: none;
    box-shadow: none;
    border-color: var(--border-color);
  }

  .project-card h3 {
    color: var(--accent-color);
    margin-bottom: 0.5rem;
  }

  .project-card p {
    color: var(--secondary-text);
    font-size: 0.9rem;
  }
  
  .no-projects {
    text-align: center;
    padding: 2rem;
    background-color: var(--card-background);
    border: 1px dashed var(--border-color);
    border-radius: 8px;
  }
  
  /* Project Dashboard Styles */
  .dashboard-header {
    margin-bottom: 2rem;
  }

  .dashboard-header .back-button {
    margin-bottom: 1rem;
  }
  
  .dashboard-header h1 {
    font-size: 3rem;
    color: var(--accent-color);
  }
  
  .dashboard-header p {
    font-size: 1.2rem;
    color: var(--secondary-text);
  }

  .dashboard-nav {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 2rem;
    flex-wrap: wrap;
    overflow-x: auto;
  }

  .dashboard-nav button {
    padding: 0.75rem 1.5rem;
    border: none;
    background: transparent;
    color: var(--secondary-text);
    font-size: 1rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
    white-space: nowrap;
  }
  .dashboard-nav button:hover:not([disabled]) {
    color: var(--primary-text);
  }
  .dashboard-nav button.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
  }

  /* Tool Specific Styles */
  .tool-grid { display: grid; gap: 1.5rem; }
  .tool-card { background: var(--card-background); border-radius: 8px; padding: 1.5rem; border: 1px solid var(--border-color); }

  /* KPI Cards */
  .kpi-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
  .kpi-card h4 { color: var(--secondary-text); font-size: 1rem; margin-bottom: 0.5rem; font-weight: 500;}
  .kpi-card .value { font-size: 2rem; font-weight: bold; }
  .kpi-card .value.green { color: var(--status-green); }
  .kpi-card .value.amber { color: var(--status-amber); }
  .kpi-card .value.red { color: var(--status-red); }

  /* Phase Tracker */
  .phase-tracker { display: flex; align-items: center; gap: 4px; background: var(--background-color); padding: 8px; border-radius: 4px; }
  .phase-tracker-segment { flex: 1; height: 10px; background: var(--locked-color); transition: background-color 0.3s; }
  .phase-tracker-segment.completed { background: var(--status-green); }
  .phase-tracker-segment.inprogress { background: var(--status-amber); }

  /* Swimlanes */
  .swimlane { margin-bottom: 1rem; }
  .swimlane h4 { margin-bottom: 0.5rem; }
  .swimlane-content { display: flex; gap: 1rem; padding: 1rem; background: var(--background-color); border-radius: 4px; overflow-x: auto;}
  .task-card { background: #2a2a3a; padding: 0.75rem; border-radius: 4px; border-left: 3px solid var(--accent-color); min-width: 150px; }

  /* Document Center */
  .document-filters { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
  .document-table { width: 100%; border-collapse: collapse; }
  .document-table th, .document-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
  .document-table th { color: var(--secondary-text); }
  .upload-dropzone { border: 2px dashed var(--border-color); border-radius: 8px; padding: 2rem; text-align: center; background: var(--background-color); margin-top: 1.5rem; }
  
  .document-status-select {
    border-radius: 1rem;
    border: none;
    padding: 0.25rem 0.75rem;
    font-weight: bold;
    font-size: 0.8rem;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 0.65em auto;
    padding-right: 1.5rem;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='292.4' height='292.4'%3E%3Cpath fill='%230a0a1a' d='M287 69.4a17.6 17.6 0 0 0-13-5.4H18.4c-5 0-9.3 1.8-12.9 5.4A17.6 17.6 0 0 0 0 82.2c0 5 1.8 9.3 5.4 12.9l128 127.9c3.6 3.6 7.8 5.4 12.8 5.4s9.2-1.8 12.8-5.4L287 95c3.5-3.5 5.4-7.8 5.4-12.8 0-5-1.9-9.2-5.5-12.8z'/%3E%3C/svg%3E");
  }

  .document-status-select.chip-green { background-color: var(--status-green); color: var(--background-color); }
  .document-status-select.chip-amber { background-color: var(--status-amber); color: var(--background-color); }
  .document-status-select.chip-red { background-color: var(--status-red); color: var(--background-color); }
  .document-status-select.chip-green option,
  .document-status-select.chip-amber option,
  .document-status-select.chip-red option { 
    background-color: var(--card-background); color: var(--primary-text); 
  }

  /* Project Tracking Tool */
  .tracking-view-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
  .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; padding-top: 1rem; }
  .kanban-column { background-color: var(--background-color); border-radius: 4px; padding: 0.75rem; }
  .kanban-column h4 { margin-bottom: 1rem; text-align: center; text-transform: capitalize; }
  .kanban-card { background: #2a2a3a; padding: 1rem; border-radius: 4px; margin-bottom: 0.75rem; cursor: grab; font-size: 0.9rem; border-left: 3px solid var(--border-color); }
  .kanban-card.todo { border-left-color: var(--task-todo-color); }
  .kanban-card.inprogress { border-left-color: var(--task-inprogress-color); }
  .kanban-card.review { border-left-color: var(--task-review-color); }
  .kanban-card.done { border-left-color: var(--task-done-color); text-decoration: line-through; opacity: 0.7; }

  /* Gantt Chart */
  .gantt-container { overflow-x: auto; padding: 1rem; background-color: var(--background-color); border-radius: 4px; position: relative; }
  .gantt-dependency-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
  .gantt-dependency-line {
    stroke: var(--accent-color);
    stroke-width: 2;
    fill: none;
    opacity: 0.7;
  }
  .gantt-dependency-arrow {
    fill: var(--accent-color);
  }
  .gantt-grid { display: grid; gap: 4px 0; align-items: center; }
  .gantt-header { grid-column: 2 / -1; display: grid; padding-left: 1rem; }
  .gantt-date { font-size: 0.75rem; color: var(--secondary-text); text-align: center; }
  .gantt-sprint-label { font-weight: bold; padding: 1rem; text-align: right; font-size: 0.9rem; }
  .gantt-task-row { grid-column: 2 / -1; display: grid; padding-left: 1rem; position: relative; height: 30px; }
  .gantt-task-bar { height: 100%; background-color: var(--accent-color); border-radius: 4px; color: var(--background-color); font-size: 0.8rem; padding: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .task-bar-todo { background: var(--task-todo-color); }
  .task-bar-inprogress { background: var(--task-inprogress-color); }
  .task-bar-review { background: var(--task-review-color); }
  .task-bar-done { background: var(--task-done-color); }
  .gantt-task-bar.blocked {
    background: repeating-linear-gradient(45deg, var(--status-red), var(--status-red) 10px, #ff6b6b 10px, #ff6b6b 20px);
    cursor: not-allowed;
  }
  
  /* Task List & Milestones Table */
  .task-list-table, .milestones-table { width: 100%; border-collapse: collapse; }
  .task-list-table th, .task-list-table td,
  .milestones-table th, .milestones-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
  .task-list-table th, .milestones-table th { color: var(--secondary-text); }
  .dependency-select {
    width: 100%;
    min-height: 80px;
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--primary-text);
  }
  .dependency-select option {
    padding: 0.25rem;
  }

  /* Revision Control Tool */
  .impact-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
  .impact-table th, .impact-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
  .impact-table th { color: var(--secondary-text); }
  .impact-table td:first-child { font-weight: bold; }
  .impact-positive { color: var(--status-red); }
  .impact-negative { color: var(--status-green); }
  
  /* HMAP Phase Card Styles */
  .phase-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 1.5rem;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .phase-header {
    padding: 1.5rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .phase-header:hover {
    background: #2a2a3a;
  }
  
  .phase-header h3 {
    font-size: 1.5rem;
    margin: 0;
  }

  .lock-reason {
    font-size: 0.85rem;
    color: var(--status-amber);
    margin-top: 0.5rem;
    font-style: italic;
  }

  .phase-status {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: bold;
    text-transform: uppercase;
  }
  .phase-status.completed { background-color: var(--success-color); color: var(--background-color); }
  .phase-status.todo { background-color: var(--accent-color); color: var(--background-color); }
  .phase-status.locked { background-color: var(--locked-color); color: var(--primary-text); }

  .phase-content {
    padding: 0 1.5rem 1.5rem;
  }
  
  .phase-card.locked {
    opacity: 0.6;
  }
  .phase-card.locked .phase-header {
    cursor: not-allowed;
  }
  .phase-card.locked .phase-header:hover {
    background: transparent;
  }
  .phase-card.locked h3 { color: var(--secondary-text); }
  
  .phase-card.completed h3 { color: var(--success-color); }

  .phase-content p.display-content {
    white-space: pre-wrap;
    background-color: var(--background-color);
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    color: var(--primary-text);
    line-height: 1.7;
    margin-bottom: 1rem;
  }

  .phase-content textarea {
    width: 100%;
    min-height: 250px;
    padding: 1rem;
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--primary-text);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    line-height: 1.7;
    resize: vertical;
    margin-bottom: 1rem;
  }

  .phase-content textarea:focus {
    outline: 1px solid var(--accent-color);
    border-color: var(--accent-color);
  }

  .phase-actions {
    margin-top: 1.5rem;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
  }
  
  .status-message {
    text-align: center;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 1rem;
  }
  
  .status-message.loading {
    background-color: rgba(0, 242, 255, 0.1);
  }
  
  .status-message.error {
    background-color: rgba(255, 77, 77, 0.1);
    color: var(--error-color);
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
    font-size: 1.8rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 10px rgba(0, 242, 255, 0.3);
    z-index: 999;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .help-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 15px rgba(0, 242, 255, 0.4);
  }

  /* Help Modal */
  .help-modal-content {
    max-width: 800px;
    width: 95%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  
  .help-modal-body {
    overflow-y: auto;
    flex-grow: 1;
    padding-right: 1rem; /* for scrollbar */
  }

  /* Styles for parsed markdown content */
  .help-modal-body h1,
  .help-modal-body h2,
  .help-modal-body h3 {
    color: var(--accent-color);
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }
  .help-modal-body h1 { font-size: 2rem; }
  .help-modal-body h2 { font-size: 1.7rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
  .help-modal-body h3 { font-size: 1.4rem; }
  
  .help-modal-body p {
    margin-bottom: 1rem;
    line-height: 1.7;
  }

  .help-modal-body ul,
  .help-modal-body ol {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }

  .help-modal-body li {
    margin-bottom: 0.5rem;
    line-height: 1.7;
  }
  
  .help-modal-body a {
    text-decoration: underline;
  }
  
  .help-modal-body code {
    background-color: var(--background-color);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: monospace;
  }

  .help-modal-body strong {
    font-weight: bold;
    color: var(--primary-text);
  }
  
  .help-modal-body hr {
    border: 0;
    border-top: 1px solid var(--border-color);
    margin: 2rem 0;
  }

  /* Change Deployment Modal */
  .change-deployment-modal {
    max-width: 700px;
  }

  .deployment-progress {
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    color: var(--secondary-text);
  }

  .deployment-step {
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
  }
  
  .deployment-step h4 {
    color: var(--accent-color);
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }
  
  .deployment-step-action {
    font-size: 1.5rem;
    font-weight: bold;
    margin-right: 0.75rem;
  }
  .deployment-step-action.add { color: var(--status-green); }
  .deployment-step-action.delete { color: var(--error-color); }
  .deployment-step-action.edit { color: var(--status-amber); }
  
  .deployment-step-target {
    font-weight: bold;
  }
  
  .deployment-step-details {
    margin-top: 1rem;
    padding-left: 1rem;
    border-left: 2px solid var(--border-color);
    font-size: 0.9rem;
    color: var(--secondary-text);
  }
  
  .deployment-step-details p {
    margin: 0.5rem 0;
  }
`;