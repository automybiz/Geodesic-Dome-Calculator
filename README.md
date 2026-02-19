# Geodesic Dome Spec & DIY Plywood-Panel Estimator

A specialized web-based calculator designed to help DIY builders estimate the cost and material requirements for geodesic domes, specifically optimized for **4x4 foot plywood or 5x5 foot tin panel construction**.

## 🚀 Core Features

### 📐 Precision Engineering
- **End-to-End (E2E) Accuracy:** All strut lengths are calculated as real-world cut lengths. The logic automatically adds material for flattened ends based on a standard 3/4" hole offset.
- **Material Constraint Protection:** Automatically scales frequency (V) to ensure triangle diagonals stay under 48 inches, making them compatible with standard 4x4 plywood sheets. The 48 inch Diagonal default can be edited to accomodate larger panels as well like 5x5 foot tin sheets.
- **Golden Ratio Integration:** Uses the Golden Ratio (1.618) to maintain the relationship between the Diagonal and Max Strut Length.

### 💰 Realistic Costing
- **Tube-Based Pricing:** Unlike standard calculators, this tool accounts for material waste by calculating the total number of **10-foot conduit tubes** required for your specific cut list.
- **Live Price Comparison:** Instant visual feedback comparing your DIY costs against retail dome company (Pacific Domes).
  - **RED:** DIY is more expensive than retail.
  - **WHITE:** DIY is cheaper, but below your savings goal.
  - **GREEN:** DIY meets your custom savings threshold (e.g., 25% cheaper).

### 🛠️ Builder Tools
- **Dynamic Tooltips:** Hover over any column header for detailed engineering guidance on measuring, flattening, and drilling.
- **Global Settings:** Adjust your "Savings Threshold (%)" globally to see how it affects your project's value.
- **Collapsible Legend:** High-level project definitions tucked away for a cleaner workspace.

---

## 💻 Local Development Setup

To edit and preview this project on your machine:

1. **Install Live Server:**
   ```bash
   npm install -g live-server
   ```
2. **Start the Project:**
   Open a terminal in the `v1.0` folder and run:
   ```bash
   live-server --port=8080
   ```
3. **Auto-Focus Workflow (Windows):**
   Double-click `focus_firefox.bat` to automatically bring your browser to the front whenever you save a file in VS Code.

---

## 📂 Project Structure
- `.conductor/`: Contains the `conductor.prompt` instructions for AI-assisted development.
- `.vscode/`: Custom workspace settings and tasks for an optimized developer experience.
- `app.js`: Core geometric and financial logic.
- `index.html`: The interactive calculator UI.
- `style.css`: Dark-themed, high-contrast cyan styling.

---

*Built with ❤️ for the DIY Dome community. Inspired by Fusion 360 sketches and Google AI Studio.*
