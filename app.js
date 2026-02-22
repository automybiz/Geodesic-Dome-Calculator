const UPDATE_DELAY = 333;
const PHI = 1.618034; 
const CONDUIT_TUBE_LENGTH_MM = 3048; // 10 Feet in mm
const STRUT_HOLE_OFFSET_MM = 19.05; // 3/4 inch in mm
let updateTimeout;

// Panel Materials Data
let panelMaterials = [
    { name: "Marine Plywood (4x8)", price: 65.00, areaSqFt: 32, waste: 1.20, type: 'sheet', width: 4, length: 8 }, 
    { name: "OSB (4x8)", price: 15.00, areaSqFt: 32, waste: 1.20, type: 'sheet', width: 4, length: 8 },           
    { name: "Polycarbonate (4x8)", price: 120.00, areaSqFt: 32, waste: 1.15, type: 'sheet', width: 4, length: 8 }, 
    { name: "Shrink Wrap (Roll)", price: 200.00, areaSqFt: 1500, waste: 1.10, type: 'roll', width: 20, length: 75 }, 
    { name: "Canvas (yd)", price: 15.00, areaSqFt: 9, waste: 1.15, type: 'unit', width: 9, length: 1 }             
];

let editingMaterialIndex = -1; // Track if we are editing

const TOOLTIP_COLUMN_SAVINGS = `Adjust the Savings Threshold (%) you want to save compared to the Pacific Domes prices. This affects the Color Coding in the DIY Price column.
<ul>
    <li>RED for Prices ABOVE the Pacific Domes Price</li>
    <li>WHITE for Prices BELOW the Pacific Domes Price</li>
    <li>GREEN for Prices BELOW the Savings Threshold (%)</li>
</ul>`;

const TOOLTIP_COLUMN_DIY_FREQ = `Frequency (V) indicates how many times the triangles of a 1V dome (icosahedron) are subdivided.

<b>Optimization Modes:</b>
<ul>
    <li><b>Lowest Price (Budget):</b> The calculator scans all frequencies and automatically picks the one that results in the lowest total cost (Frame + Hardware).</li>
    <li><b>Lowest Frequency (Complexity):</b> The calculator picks the simplest dome with the fewest parts that still fits your material.</li>
</ul>

<b>Difficulty Level:</b>
<ul>
    <li><b>1V - 3V:</b> Easiest. Few parts and simple assembly tiers. Perfect for first-time DIYers.</li>
    <li><b>4V - 5V:</b> Moderate. Requires more focus on tier-by-tier assembly and color-coding.</li>
    <li><b>6V - 8V:</b> Hardest. Involves hundreds of struts and many unique lengths. Recommended for large commercial or structural domes.</li>
</ul>`;

const TOOLTIP_COLUMN_DIAGONAL = `The maximum width of your pentagonal panel cluster (the "star" shape).
<ul>
    <li><b>Reference Only:</b> This column is now calculated automatically (Longest Strut × 1.618) and does not affect the red warning logic.</li>
    <li><b>Hidable:</b> You can hide this entire column in the Default Global Settings to reduce clutter.</li>
    <li><b>Pacific Domes Reference:</b> Their 16' to 24' (2V/3V) domes typically use diagonals ranging from 96" to 144" (2438mm to 3658mm).</li>
</ul>`;

const TOOLTIP_DEFAULT_DIAGONAL = `The maximum width of your pentagonal panel cluster (the "star" shape).
<ul>
    <li><b>Reference Only:</b> This column is now calculated automatically (Longest Strut × 1.618) and does not affect the red warning logic.</li>
    <li><b>Pacific Domes Reference:</b> Their 16' to 24' (2V/3V) domes typically use diagonals ranging from 96" to 144" (2438mm to 3658mm).</li>
</ul>`;

const TOOLTIP_COLUMN_STRUT_LEN = `The end to end length of the conduit strut. 
<ul>
    <li><b>Standard:</b> Physical tip to physical tip.</li>
    <li><b>Hole Offset:</b> Includes 3/4" (19.05mm) offset on each end.</li>
    <li><b>The Red Warning:</b> Now optimized for individual panel cutting! A strut turns red only if it's too big to fit on your <b>Sheet Width</b> even with the "30° Tilt" trick.</li>
    <li><b>Conflict Resolution:</b> Increase Frequency (V) or Sheet Size.</li>
    <li><b>Fractions:</b> Imperial modes use precise 1/16th construction fractions.</li>
</ul>

<b>The 30° "Secret Sauce":</b>
How do we fit a 4.6 ft triangle on a 4 ft sheet? 
<ul>
    <li><b>The Trick:</b> We don't lay the triangle flat. We tilt it 30 degrees.</li>
    <li><b>The Math:</b> By tilting, we use the <b>Cosine of 30° (0.866)</b>. The sheet width becomes the "base" of a larger right triangle.</li>
    <li><b>The Formula:</b> Max Strut = Sheet Width ÷ 0.866. This unlocks roughly <b>15% more length</b> out of every sheet!</li>
</ul>

<b>Decoding Strut Labels (A-Z):</b>
<ul>
    <li><b>Labels = Groups:</b> All struts with the same letter (e.g., "A") are identical in length.</li>
    <li><b>Sorting:</b> Struts are listed from shortest to longest for your convenience, regardless of their letter.</li>
    <li><b>Assembly Order (Tiers):</b>
        <ul>
            <li><b>(A):</b> The base layer (Deck Level) at the foundation.</li>
            <li><b>(B):</b> The next tier built on top of A, and so on.</li>
        </ul>
    </li>
</ul>`;

const TOOLTIP_COLUMN_BASE_FREQ = `The lowest frequency recommended for structural stability at that dome size.`;

const TOOLTIP_COLUMN_WHY_RED = `<b>MATERIAL CONFLICT:</b> This strut is too long to be cut from the specified sheet width. 
<ul>
    <li>Check your "Sheet Width" input (Material Size).</li>
    <li>Increase the "DIY Frequency" to subdivide panels further.</li>
    <li>Current strut length exceeds the physical sheet limit by the amount shown.</li>
</ul>`;

const TOOLTIP_DEFAULT_WASTE_MODES = `<b>Waste Estimation Modes:</b>
<ul>
    <li><b>1:2 Ratio (Rectangle):</b> Ideal for efficiency. Assumes triangular nesting (flipping up/down) to use ~85% of the sheet. (~15% Waste)</li>
    <li><b>1:1 Ratio (Square):</b> Less efficient. Assumes cutting one main panel shape per sheet/section, discarding significantly more off-cuts. (~50% Waste)</li>
</ul>`;

const TOOLTIP_DEFAULT_MAT_EFFICIENCY = `<b>Material Efficiency Guide:</b>
<ul>
    <li><b>1:2 Ratio (Rectangle):</b> e.g. 4x8, 5x10. Best for nesting triangles (Up/Down). Waste ~15%.</li>
    <li><b>1:1 Ratio (Square):</b> e.g. 4x4, 5x5. Hard to nest efficiently. If cutting 1 triangle/panel per sheet, waste is >50%.</li>
</ul>`;

const TOOLTIP_COLUMN_PANEL_COST = `<b>How Panels Per Sheet Works:</b>
The number of panels you get from a single sheet varies wildly by Frequency:
<ul>
    <li><b>Low Freq (2V):</b> Huge panels = Few per sheet (e.g. 1-2).</li>
    <li><b>High Freq (4V+):</b> Tiny panels = Many per sheet (e.g. 10+).</li>
</ul>
The calculator math: (Total Dome Area ÷ Sheet Area) * Waste Factor.`;

const TOOLTIP_COLUMN_TOTAL_STRUTS = `<b>Assembly Order (Tiers):</b>
Strut groups are listed alphabetically (A, B, C...) to guide your build:
<ul>
    <li><b>(A):</b> The base layer (Deck Level) that touches your foundation.</li>
    <li><b>(B):</b> The next tier built on top of A.</li>
    <li><b>(C):</b> The following tier, and so on.</li>
</ul>
<i>Tip: Label your struts by letter during cutting to make assembly much faster!</i>`;

const TOOLTIP_DEFAULT_FREQ_OPTIMIZE = `<b>Optimization Behavior:</b>
This setting defines the "logic" used during page load or when you change material sizes.
<ul>
    <li><b>Note:</b> Changing this dropdown will not instantly reset your current frequencies. It will take effect upon the next <b>Page Refresh</b> or when you modify a <b>Sheet Width</b> or <b>Diagonal</b> value.</li>
    <li>This prevents the calculator from accidentally overwriting your manual frequency choices while you are working.</li>
</ul>`;

const TOOLTIP_COLUMN_CONDUIT_SAFETY = `<b>Conduit Safety & Sizing:</b>
<br>
<br>
<b>1. Strut Length is the Critical Factor</b>
<br>Smaller frequencies lead to smaller strut sizes, which are more resistant to bowing and kinking. This is because the slenderness ratio of the strut determines its buckling strength. Longer struts are significantly weaker under compression.
<br><br>
<b>2. EMT Size Recommendations</b>
<ul>
    <li><b>1/2" EMT:</b> Generally safe for struts up to 4-5 feet.</li>
    <li><b>3/4" EMT:</b> Generally safe for struts up to 6-7 feet.</li>
    <li><b>1" EMT:</b> Generally safe for struts up to 8-10 feet.</li>
    <li><b>1.25" EMT:</b> Recommended for struts exceeding 10 feet or for high-load environments (snow/heavy panels).</li>
</ul>
<b>3. Safety Logic</b>
<br>The calculator monitors the longest strut in your configuration:
<ul>
    <li>If any strut exceeds 5ft (1524mm), 1/2" EMT is flagged as <span class="price-red">Unsafe</span>.</li>
    <li>If any strut exceeds 7ft (2133mm), 3/4" EMT is flagged as <span class="price-red">Unsafe</span>.</li>
    <li>If any strut exceeds 10ft (3048mm), 1" EMT is flagged as <span class="price-red">Unsafe</span>.</li>
</ul>`;

const TOOLTIP_MAP = {
    TOOLTIP_COLUMN_SAVINGS,
    TOOLTIP_COLUMN_DIY_FREQ,
    TOOLTIP_COLUMN_DIAGONAL,
    TOOLTIP_DEFAULT_DIAGONAL,
    TOOLTIP_COLUMN_STRUT_LEN,
    TOOLTIP_COLUMN_BASE_FREQ,
    TOOLTIP_COLUMN_WHY_RED,
    TOOLTIP_DEFAULT_WASTE_MODES,
    TOOLTIP_DEFAULT_MAT_EFFICIENCY,
    TOOLTIP_COLUMN_PANEL_COST,
    TOOLTIP_COLUMN_TOTAL_STRUTS,
    TOOLTIP_DEFAULT_FREQ_OPTIMIZE,
    TOOLTIP_COLUMN_CONDUIT_SAFETY
};

// Geodesic Data (Ratios & Quantities)
const freqData = {
    "1V": { struts: 25, bolts: 10, parts: { "A": { r: 0.618, qty: 25 } } },
    "2V": { struts: 65, bolts: 26, parts: { "A": { r: 0.618, qty: 35 }, "B": { r: 0.5465, qty: 30 } } },
    "3V": { struts: 165, bolts: 61, parts: { "A": { r: 0.3486, qty: 30 }, "B": { r: 0.4035, qty: 55 }, "C": { r: 0.4124, qty: 80 } } },
    "4V": { struts: 250, bolts: 91, parts: { "A": { r: 0.2531, qty: 30 }, "B": { r: 0.2945, qty: 30 }, "C": { r: 0.2945, qty: 60 }, "D": { r: 0.3129, qty: 70 }, "E": { r: 0.3243, qty: 30 }, "F": { r: 0.2985, qty: 30 } } },
    "5V": { struts: 425, bolts: 151, parts: { "A": { r: 0.198, qty: 60 }, "B": { r: 0.231, qty: 30 }, "C": { r: 0.232, qty: 30 }, "D": { r: 0.253, qty: 80 }, "H": { r: 0.266, qty: 70 } } },
    "6V": { struts: 555, bolts: 196, parts: { "A": { r: 0.165, qty: 60 }, "B": { r: 0.189, qty: 60 }, "F": { r: 0.218, qty: 120 } } },
    "7V": { struts: 765, bolts: 271, parts: { "A": { r: 0.141, qty: 60 }, "B": { r: 0.162, qty: 60 }, "C": { r: 0.163, qty: 60 }, "D": { r: 0.180, qty: 120 }, "G": { r: 0.194, qty: 120 } } },
    "8V": { struts: 1025, bolts: 361, parts: { "A": { r: 0.124, qty: 60 }, "B": { r: 0.142, qty: 60 }, "C": { r: 0.143, qty: 60 }, "D": { r: 0.158, qty: 120 }, "L": { r: 0.170, qty: 120 } } }
};

const CONDUIT_SAFETY_LIMITS = {
    "1/2": 1524,    // 5ft
    "3/4": 2133.6,  // 7ft
    "1": 3048,      // 10ft
    "1.25": 4572    // 15ft (Estimated upper bound for 1.25" EMT)
};

const domeConfigs = [
    { size: "16'", radiusMM: 2438.4, pd: "$1,750 (2V)", baseFreq: "3V" },
    { size: "18'", radiusMM: 2743.2, pd: "N/A", baseFreq: "3V" },
    { size: "20'", radiusMM: 3048.0, pd: "$2,800 (3V)", baseFreq: "3V" },
    { size: "22'", radiusMM: 3352.8, pd: "N/A", baseFreq: "3V" },
    { size: "24'", radiusMM: 3657.6, pd: "$3,250 (3V 5/8)", baseFreq: "3V" },
    { size: "26'", radiusMM: 3962.4, pd: "N/A", baseFreq: "3V" },
    { size: "28'", radiusMM: 4267.2, pd: "N/A", baseFreq: "3V" },
    { size: "30'", radiusMM: 4572.0, pd: "$4,200 (4V)", baseFreq: "3V" },
    { size: "32'", radiusMM: 4876.8, pd: "N/A", baseFreq: "4V" },
    { size: "34'", radiusMM: 5181.6, pd: "N/A", baseFreq: "4V" },
    { size: "36'", radiusMM: 5486.4, pd: "$6,600 (5V 5/8)", baseFreq: "4V" },
    { size: "38'", radiusMM: 5791.2, pd: "N/A", baseFreq: "4V" },
    { size: "40'", radiusMM: 6096.0, pd: "N/A", baseFreq: "4V" },
    { size: "42'", radiusMM: 6400.8, pd: "N/A", baseFreq: "4V" },
    { size: "44'", radiusMM: 6705.6, pd: "$12,950 (6V)", baseFreq: "4V" },
    { size: "46'", radiusMM: 7010.4, pd: "N/A", baseFreq: "4V" },
    { size: "48'", radiusMM: 7315.2, pd: "N/A", baseFreq: "4V" },
    { size: "50'", radiusMM: 7620.0, pd: "$15,000 (6V)", baseFreq: "4V" }
];

/**
 * Smart Parser: Converts string to Millimeters
 */
function parseToMM(str) {
    if (!str || str.trim() === "") return null;
    // Corrected regex for stripping invalid characters - escaped quotes, no newline in regex
    let clean = str.toLowerCase().replace(/[^0-9.\[\/\"mcinfoet\s\]]/g, "");
    clean = clean.replace(/feet|foot/g, "ft").replace(/inches|inch/g, "in");
    const activeUnit = document.getElementById("unitSelect")?.value || "ft";

    if (clean.includes("'") || clean.includes("\"") || clean.includes("ft") || clean.includes("in") || (activeUnit === "ft" || activeUnit === "in")) {
        let totalInches = 0;
        const ftMatch = clean.match(/([\d.]+)\s*(?:\'|ft)/);
        if (ftMatch) totalInches += parseFloat(ftMatch[1]) * 12;
        let inchPart = clean;
        if (ftMatch) inchPart = clean.split(ftMatch[0])[1] || "";
        const fracMatch = inchPart.match(/(\d+)\/(\d+)/);
        if (fracMatch) {
            totalInches += parseFloat(fracMatch[1]) / parseFloat(fracMatch[2]);
            inchPart = inchPart.replace(fracMatch[0], "");
        }
        const inchMatch = inchPart.match(/([\d.]+)(?:\s*(?:\"|in)|$)/);
        // Only add as inches if there was an explicit inch marker OR if we already found feet/fraction
        // Otherwise, if it's just a number, we should fall through to the default unit handling below
        if (inchMatch && (inchPart.includes('"') || inchPart.includes('in') || ftMatch || fracMatch)) {
             totalInches += parseFloat(inchMatch[1]);
        }
        
        if (!ftMatch && !fracMatch && (!inchMatch || (!inchPart.includes('"') && !inchPart.includes('in')))) {
            const raw = parseFloat(clean.match(/[\d.]+/)?.[0] || 0);
            totalInches = activeUnit === "ft" ? raw * 12 : raw;
        }
        return totalInches * 25.4;
    }

    const val = parseFloat(clean.match(/[\d.]+/)?.[0] || 0);
    if (clean.includes("mm")) return val;
    if (clean.includes("cm")) return val * 10;
    if (clean.includes("m") && !clean.includes("mm") && !clean.includes("cm")) return val * 1000;
    if (activeUnit === "mm") return val;
    if (activeUnit === "cm") return val * 10;
    if (activeUnit === "m") return val * 1000;
    return val;
}

function formatFromMM(mm) {
    const unit = document.getElementById("unitSelect")?.value || "ft";
    if (unit === "mm") return `${Math.round(mm)}mm`;
    if (unit === "cm") return `${(mm / 10).toFixed(1)}cm`;
    if (unit === "m") return `${(mm / 1000).toFixed(3)}m`;
    const totalInches = mm / 25.4;
    if (unit === "in") {
        const wholeInches = Math.floor(totalInches);
        const sixteenths = Math.round((totalInches - wholeInches) * 16);
        return formatImperial(0, wholeInches, sixteenths, false);
    }
    const ft = Math.floor(totalInches / 12);
    const remainderInches = totalInches - (ft * 12);
    const wholeInches = Math.floor(remainderInches);
    const sixteenths = Math.round((remainderInches - wholeInches) * 16);
    return formatImperial(ft, wholeInches, sixteenths, true);
}

function formatImperial(ft, inch, sixteenths, showFt) {
    let finalFt = ft, finalInch = inch, finalSix = sixteenths;
    if (finalSix === 16) { finalSix = 0; finalInch++; }
    if (finalInch === 12 && showFt) { finalInch = 0; finalFt++; }
    let fracStr = "";
    if (finalSix > 0) {
        let n = finalSix, d = 16;
        while (n % 2 === 0 && d % 2 === 0) { n /= 2; d /= 2; }
        fracStr = ` ${n}/${d}`;
    }
    let res = "";
    if (showFt && finalFt > 0) res += `${finalFt}\' `;
    res += `${finalInch}"${fracStr}`;
    return res.trim().toLowerCase();
}

/* Accordion Logic */
function toggleAccordion(contentId) {
    const content = document.getElementById(contentId || "accordionContent");
    if (!content) return;
    
    const header = content.previousElementSibling;
    const icon = header.querySelector(".icon");
    const isOpen = content.classList.contains("open");
    
    // Determine storage key based on content ID
    const storageKey = "accordionOpen_" + (contentId || "default");
    
    if (isOpen) {
        content.classList.remove("open");
        if (icon) icon.innerText = "▼";
        localStorage.setItem(storageKey, "false");
    } else {
        content.classList.add("open");
        if (icon) icon.innerText = "▲";
        localStorage.setItem(storageKey, "true");
    }
}

/* Panel Material Logic */
function populateMaterialSelect() {
    const select = document.getElementById("panelMaterialSelect");
    // Load from local storage if available
    const stored = localStorage.getItem("panelMaterials");
    if (stored) panelMaterials = JSON.parse(stored);

    select.innerHTML = "";
    panelMaterials.forEach((mat, index) => {
        const opt = document.createElement("option");
        opt.value = index;
        opt.innerText = mat.name;
        select.appendChild(opt);
    });
    
    // Restore selection
    const savedIndex = localStorage.getItem("selectedMaterialIndex");
    if (savedIndex !== null && panelMaterials[savedIndex]) {
        select.value = savedIndex;
    } else {
        localStorage.setItem("selectedMaterialIndex", 0);
        select.value = 0;
    }
    
    populateRowMaterialSelects();
}

function populateRowMaterialSelects() {
    const selects = document.querySelectorAll(".s-mat-sel");
    const storedSelections = JSON.parse(localStorage.getItem("rowMaterialSelections") || "{}");

    selects.forEach(sel => {
        const rowIndex = sel.closest("tr").getAttribute("data-id");
        sel.innerHTML = `<option value="default">Use Global Default</option>`;
        panelMaterials.forEach((mat, idx) => {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.innerText = mat.name;
            sel.appendChild(opt);
        });

        // Restore row selection
        if (storedSelections[rowIndex] !== undefined) {
            sel.value = storedSelections[rowIndex];
        } else {
            sel.value = "default";
        }
    });
}

function updatePanelCost() {
    const index = document.getElementById("panelMaterialSelect").value;
    const mat = panelMaterials[index];
    if (mat) {
        const costPerSqFt = mat.price / mat.areaSqFt;
        const wastePct = Math.round((mat.waste - 1) * 100);
        document.getElementById("panelCostDisplay").innerText = 
            `Price: $${mat.price} | Area: ${mat.areaSqFt} sqft | Waste: ${wastePct}%`;
        localStorage.setItem("selectedMaterialIndex", index);
        recalcAll();
    }
}

function autoEstimateWaste() {
    const type = document.getElementById("newMatType").value;
    const sheetW = parseFloat(document.getElementById("newMatWidth").value) || 4;
    const sheetL = parseFloat(document.getElementById("newMatLength").value) || 8;
    
    if (type === 'unit') {
        document.getElementById("newMatWaste").value = 5;
        document.getElementById('wasteVal').innerText = `(5%)`;
        return;
    }

    // Use the longest strut from the first row as a reference for 'typical' waste
    const firstRow = document.querySelector("#tableBody tr");
    let refStrutMM = 1000; // Default 1m
    if (firstRow) {
        const struts = firstRow.querySelectorAll(".vis-eye");
        if (struts.length > 0) {
            // Extract mm from the onmouseenter attribute
            const match = struts[struts.length-1].getAttribute("onmouseenter").match(/showVisualizer\(this, ([\d.]+)\)/);
            if (match) refStrutMM = parseFloat(match[1]);
        }
    }
    const s = refStrutMM / 304.8; // Strut in feet
    const COS30 = 0.866;
    
    // Honeycomb Packing Logic
    const triArea = (s * s * Math.sqrt(3)) / 4;
    const colWidth = s * COS30;
    const cols = Math.floor(sheetW / colWidth) || 1;
    const rows = Math.floor(sheetL / s) || 1;
    
    // Rough estimate: each 'cell' of s x colWidth fits 2 triangles
    const totalTriangles = cols * rows * 2;
    const utilizedArea = totalTriangles * triArea;
    const sheetArea = sheetW * sheetL;
    
    let waste = Math.round((1 - (utilizedArea / sheetArea)) * 100);
    if (waste < 5) waste = 5;
    if (waste > 60) waste = 60;
    
    document.getElementById("newMatWaste").value = waste;
    document.getElementById('wasteVal').innerText = `(${waste}%)`;
}

/* Modal Functions */
function openMaterialModal() {
    editingMaterialIndex = -1; // Reset to Add mode
    document.getElementById("materialModal").style.display = "block";
    
    // Clear inputs
    document.getElementById("newMatName").value = "";
    document.getElementById("newMatPrice").value = "";
    document.getElementById("newMatWidth").value = "4";
    document.getElementById("newMatLength").value = "8";
    document.getElementById("newMatType").value = "sheet";
    
    // Auto-set waste for default type (Sheet)
    autoEstimateWaste('rect');
    
    toggleMatInputs();
    updateModalVisualizer();
    
    document.querySelector("#materialModal h3").innerText = "Add New Material";
    document.getElementById("newMatName").focus();
}

function editCurrentMaterial() {
    const index = document.getElementById("panelMaterialSelect").value;
    const mat = panelMaterials[index];
    if (!mat) return;

    editingMaterialIndex = index;
    document.getElementById("materialModal").style.display = "block";
    document.querySelector("#materialModal h3").innerText = "Edit Material";

    document.getElementById("newMatName").value = mat.name;
    document.getElementById("newMatPrice").value = mat.price;
    document.getElementById("newMatType").value = mat.type || "sheet";
    
    // Populate Dimensions
    if (mat.type === 'unit') {
        document.getElementById("newMatWidth").value = mat.areaSqFt;
    } else {
        document.getElementById("newMatWidth").value = mat.width || 4;
        document.getElementById("newMatLength").value = mat.length || 8;
    }
    
    const wastePct = Math.round(((mat.waste || 1.15) - 1) * 100);
    document.getElementById("newMatWaste").value = wastePct;
    document.getElementById('wasteVal').innerText = `(${wastePct}%)`;

    toggleMatInputs();
    updateModalVisualizer();
}

function deleteCurrentMaterial() {
    const index = parseInt(document.getElementById("panelMaterialSelect").value);
    if (panelMaterials.length <= 1) {
        alert("You must have at least one material defined.");
        return;
    }

    if (confirm(`Are you sure you want to delete "${panelMaterials[index].name}"?`)) {
        panelMaterials.splice(index, 1);
        localStorage.setItem("panelMaterials", JSON.stringify(panelMaterials));
        
        // Fix row selections that might have pointed to this index or higher
        let storedSelections = JSON.parse(localStorage.getItem("rowMaterialSelections") || "{}");
        for (let rowId in storedSelections) {
            if (storedSelections[rowId] === index) {
                storedSelections[rowId] = "default";
            } else if (parseInt(storedSelections[rowId]) > index) {
                storedSelections[rowId] = (parseInt(storedSelections[rowId]) - 1).toString();
            }
        }
        localStorage.setItem("rowMaterialSelections", JSON.stringify(storedSelections));

        // Adjust global selection if needed
        let globalIndex = parseInt(localStorage.getItem("selectedMaterialIndex") || 0);
        if (globalIndex === index) {
            localStorage.setItem("selectedMaterialIndex", 0);
        } else if (globalIndex > index) {
            localStorage.setItem("selectedMaterialIndex", globalIndex - 1);
        }

        populateMaterialSelect();
        updatePanelCost();
    }
}

function closeMaterialModal() {
    document.getElementById("materialModal").style.display = "none";
}

function toggleMatInputs() {
    const type = document.getElementById("newMatType").value;
    const wGroup = document.getElementById("dimWidthGroup");
    const lGroup = document.getElementById("dimLengthGroup");
    
    if (type === 'unit') {
        wGroup.querySelector("label").innerText = "Area (sq ft)";
        lGroup.style.display = "none";
    } else {
        wGroup.querySelector("label").innerText = "Width (ft)";
        lGroup.style.display = "flex";
    }
    updateModalVisualizer();
}

function updateModalVisualizer() {
    const type = document.getElementById("newMatType").value;
    const width = parseFloat(document.getElementById("newMatWidth").value) || 1;
    const length = parseFloat(document.getElementById("newMatLength").value) || 1;
    const container = document.getElementById("modalSvgContainer");
    
    if (type === 'unit') {
        const size = Math.sqrt(width); // Represent Area as a square
        const side = 200;
        container.innerHTML = `<svg width="200" height="200">
            <rect x="10" y="10" width="180" height="180" fill="rgba(0,255,255,0.2)" stroke="#0FF" stroke-width="2" />
            <text x="100" y="110" fill="#AAA" font-size="12" text-anchor="middle">Area: ${width} sq ft</text>
        </svg>`;
    } else {
        const maxW = 300;
        const maxL = 300;
        const scale = Math.min(maxW / width, maxL / length);
        const canvasW = width * scale;
        const canvasL = length * scale;
        
        container.innerHTML = `<svg width="${canvasW}" height="${canvasL}">
            <rect x="0" y="0" width="${canvasW}" height="${canvasL}" fill="rgba(0,255,255,0.2)" stroke="#0FF" stroke-width="2" />
            <text x="${canvasW/2}" y="${canvasL/2}" fill="#AAA" font-size="12" text-anchor="middle">${width}' x ${length}'</text>
        </svg>`;
    }
}

// Attach listeners to modal inputs
document.getElementById("newMatWidth").addEventListener("input", updateModalVisualizer);
document.getElementById("newMatLength").addEventListener("input", updateModalVisualizer);

function saveNewMaterial() {
    const name = document.getElementById("newMatName").value;
    const price = parseFloat(document.getElementById("newMatPrice").value);
    const type = document.getElementById("newMatType").value;
    const width = parseFloat(document.getElementById("newMatWidth").value);
    const length = parseFloat(document.getElementById("newMatLength").value);
    const wastePct = parseFloat(document.getElementById("newMatWaste").value);

    if (!name || isNaN(price)) {
        alert("Please enter a valid Name and Price.");
        return;
    }

    let area = 0;
    if (type === 'unit') {
        area = width; // In 'unit' mode, the width input serves as Area
        if (isNaN(area)) { alert("Please enter Area."); return; }
    } else {
        if (isNaN(width) || isNaN(length)) { alert("Please enter Width and Length."); return; }
        area = width * length;
    }

    const wasteFactor = 1 + (wastePct / 100);
    const newMat = { name, price, areaSqFt: area, waste: wasteFactor, type, width, length };

    if (editingMaterialIndex > -1) {
        // Update existing
        panelMaterials[editingMaterialIndex] = newMat;
    } else {
        // Add new
        panelMaterials.push(newMat);
        editingMaterialIndex = panelMaterials.length - 1;
    }

    localStorage.setItem("panelMaterials", JSON.stringify(panelMaterials));
    
    populateMaterialSelect();
    document.getElementById("panelMaterialSelect").value = editingMaterialIndex;
    updatePanelCost(); // This triggers recalcAll
    
    closeMaterialModal();
}

// Close modal if clicking outside
window.onclick = function(event) {
    const modal = document.getElementById("materialModal");
    if (event.target === modal) {
        closeMaterialModal();
    }
}

// Close modal on Escape key
window.onkeydown = function(event) {
    if (event.key === "Escape") {
        closeMaterialModal();
    }
}

function handleEnter(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        e.target.blur();
    }
}

function getSmallestSafeConduit(maxStrutLenMM) {
    if (maxStrutLenMM <= CONDUIT_SAFETY_LIMITS["1/2"]) return "1/2";
    if (maxStrutLenMM <= CONDUIT_SAFETY_LIMITS["3/4"]) return "3/4";
    if (maxStrutLenMM <= CONDUIT_SAFETY_LIMITS["1"]) return "1";
    return "1.25";
}

function finalizeField(i, type) {
    calcRow(i, type);
}

function recalcAll() {
    domeConfigs.forEach((_, i) => calcRow(i));
}

function render() {
    // Restore accordion states
    // Default Settings
    if (localStorage.getItem("accordionOpen_accordionContent") === "true") {
        document.getElementById("accordionContent").classList.add("open");
        document.querySelector("#defaultSettingsHeader .icon").innerText = "▲";
    } else if (localStorage.getItem("accordionOpen") === "true") { 
        // Legacy fallback
        document.getElementById("accordionContent").classList.add("open");
        document.querySelector("#defaultSettingsHeader .icon").innerText = "▲";
    }

    // Usage Guide (Default Open)
    const usageState = localStorage.getItem("accordionOpen_usageGuideContent");
    if (usageState === "true" || usageState === null) {
        document.getElementById("usageGuideContent").classList.add("open");
        const guideHeader = document.getElementById("usageGuideContent").previousElementSibling;
        if(guideHeader) guideHeader.querySelector(".icon").innerText = "▲";
    }
    
    // Safety Thresholds (Default Open)
    const safetyState = localStorage.getItem("accordionOpen_safetyThresholdsContent");
    const safetyEl = document.getElementById("safetyThresholdsContent");
    if (safetyEl && (safetyState === "true" || safetyState === null)) {
        safetyEl.classList.add("open");
        const safetyHeader = safetyEl.previousElementSibling;
        if(safetyHeader) {
            const icon = safetyHeader.querySelector(".icon");
            if(icon) icon.innerText = "▲";
        }
    }

    // Restore Strut Sort Preference
    const savedSort = localStorage.getItem("strutSortPreference");
    if (savedSort) document.getElementById("strutSortSelect").value = savedSort;

    // Restore Freq Optimization Preference
    const savedOpt = localStorage.getItem("freqOptimizationPreference");
    if (savedOpt) document.getElementById("freqOptimizeSelect").value = savedOpt;

    // Restore Diagonal Visibility
    const diagVisible = localStorage.getItem("showDiagonalColumn") !== "false";
    document.getElementById("showDiagonalToggle").checked = diagVisible;

    populateMaterialSelect();
    
    // Initial display update for panel cost (without triggering recalcAll yet)
    const index = document.getElementById("panelMaterialSelect").value;
    const mat = panelMaterials[index];
    if (mat) {
        const wastePct = Math.round(((mat.waste || 1.15) - 1) * 100);
        document.getElementById("panelCostDisplay").innerText = 
            `Price: $${mat.price} | Area: ${mat.areaSqFt} sqft | Waste: ${wastePct}%`;
    }

    generateVisibilityControls();

    const body = document.getElementById("tableBody");
    body.innerHTML = "";
    
    // Load visibility state
    const hiddenRows = JSON.parse(localStorage.getItem("hiddenDomeRows") || "[]");

    populateRowMaterialSelects(); // Populate the selects before creating the rows if possible? No, they need the selects to exist.

    domeConfigs.forEach((conf, i) => {
        // Calculate precise display values
        const diamM = (conf.radiusMM * 2 / 1000).toFixed(1);
        const radiusFt = conf.radiusMM / 304.8;
        const sqFt = Math.round(2 * Math.PI * radiusFt * radiusFt);
        
        const sizeDisplay = `${conf.size} (${diamM}m)<br><span style="font-size:0.8em; color:#AAA">(~${sqFt} sq ft)</span>`;

        // Calculate Pacific Domes Specs
        let pdFreq = "3V"; // Default
        const freqMatch = conf.pd.match(/\((\d+V)\)/);
        if (freqMatch) pdFreq = freqMatch[1];
        
        // Find max strut length for this frequency to estimate diagonal
        let maxR = 0;
        if (freqData[pdFreq]) {
            for(let p in freqData[pdFreq].parts) {
                if(freqData[pdFreq].parts[p].r > maxR) maxR = freqData[pdFreq].parts[p].r;
            }
        }
        const maxStrutMM = conf.radiusMM * maxR;
        const pdDiagFt = ((maxStrutMM * 1.618) / 304.8).toFixed(1).replace(".0", ""); // Estimate Diagonal
        
        // Estimate Conduit Size
        let pdConduit = "1\"";
        const diamFt = radiusFt * 2;
        if (diamFt >= 42) pdConduit = "1.9\"";
        else if (diamFt >= 26) pdConduit = "1.3\"";

        const pdStrutFt = (maxStrutMM / 304.8).toFixed(1).replace(".0", "");
        const pdDisplay = conf.pd !== "N/A" 
            ? `${conf.pd}<br><span style="font-size:0.8em; color:#AAA">(~${pdDiagFt}' Diagonal)</span><br><span style="font-size:0.8em; color:#AAA">(~${pdStrutFt}' Strut Lengths)</span><br><span style="font-size:0.8em; color:#AAA">(~${pdConduit} Conduit)</span>`
            : "N/A";

        const row = document.createElement("tr");
        row.setAttribute("data-id", i);
        if (hiddenRows.includes(i)) {
            row.style.display = "none";
        }
        
        // Prepare options for the material dropdown
        const storedSelections = JSON.parse(localStorage.getItem("rowMaterialSelections") || "{}");
        let matOptions = `<option value="default">Use Global Default</option>`;
        panelMaterials.forEach((mat, idx) => {
            matOptions += `<option value="${idx}">${mat.name}</option>`;
        });

        row.innerHTML = `
            <td>${sizeDisplay}</td>
            <td>${pdDisplay}</td>
            <td><select class="f-sel" onchange="calcRow(${i}, 'manual')">
                <option value="1V">1V</option><option value="2V">2V</option><option value="3V">3V</option>
                <option value="4V">4V</option><option value="5V">5V</option><option value="6V">6V</option>
                <option value="7V">7V</option><option value="8V">8V</option>
            </select></td>
            <td><select class="c-sel" onchange="calcRow(${i})">
                <option value="1/2">1/2" EMT</option><option value="3/4">3/4" EMT</option>
                <option value="1">1" EMT</option><option value="1.25">1.25" EMT</option>
            </select></td>
            <td contenteditable="true" class="c-p" onkeyup="debounce(${i})"></td>
            <td class="diag diag-col"></td>
            <td><select class="s-mat-sel" onchange="onRowMaterialChange(${i})">${matOptions}</select></td>
            <td class="s-list"></td>
            <td class="t-t"></td>
            <td class="t-s"></td>
            <td class="t-h"></td>
            <td contenteditable="true" class="b-p" onkeyup="debounce(${i})"></td>
            <td contenteditable="true" class="n-p" onkeyup="debounce(${i})"></td>
            <td class="diy-total-cell"></td>
            <td class="p-cost"></td>
            <td class="fp-total"></td>
        `;
        body.appendChild(row);
        row.querySelector(".f-sel").value = conf.baseFreq;
        
        // Set the correct material selection
        const rowMatSel = row.querySelector(".s-mat-sel");
        if (storedSelections[i] !== undefined) {
            rowMatSel.value = storedSelections[i];
        } else {
            rowMatSel.value = "default";
        }
    });

    // Run calculations for all rows after they are all added to the DOM
    setTimeout(() => {
        domeConfigs.forEach((_, i) => {
            const row = document.querySelector(`tr[data-id="${i}"]`);
            if (row) {
                calcRow(i, 'init');
            }
        });
    }, 250);
    toggleDiagonalColumn(); // Apply initial visibility
    initTooltip();
}

function toggleDiagonalColumn() {
    const isVisible = document.getElementById("showDiagonalToggle").checked;
    localStorage.setItem("showDiagonalColumn", isVisible);
    
    document.querySelectorAll(".diag-col").forEach(el => el.style.display = isVisible ? "" : "none");
    const head = document.getElementById("head-diag");
    if (head) head.style.display = isVisible ? "" : "none";
}

function generateVisibilityControls() {
    const container = document.getElementById("domeVisibilityGrid");
    container.innerHTML = "";
    const hiddenRows = JSON.parse(localStorage.getItem("hiddenDomeRows") || "[]");

    domeConfigs.forEach((conf, i) => {
        const div = document.createElement("div");
        div.className = "visibility-item";
        
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !hiddenRows.includes(i);
        cb.id = `vis-check-${i}`;
        cb.onchange = () => toggleRowVisibility(i, cb.checked);
        
        const label = document.createElement("label");
        label.htmlFor = `vis-check-${i}`;
        label.innerText = conf.size.split(" ")[0]; // Just the size part e.g. "16'"
        label.style.cursor = "pointer";
        label.style.marginBottom = "0";

        div.appendChild(cb);
        div.appendChild(label);
        container.appendChild(div);
    });
}

function toggleRowVisibility(index, isVisible) {
    const row = document.querySelector(`tr[data-id="${index}"]`);
    if (row) {
        row.style.display = isVisible ? "" : "none";
    }

    let hiddenRows = JSON.parse(localStorage.getItem("hiddenDomeRows") || "[]");
    if (!isVisible) {
        if (!hiddenRows.includes(index)) hiddenRows.push(index);
    } else {
        hiddenRows = hiddenRows.filter(id => id !== index);
    }
    localStorage.setItem("hiddenDomeRows", JSON.stringify(hiddenRows));
}

function showOnlyPD() {
    let hiddenRows = [];
    domeConfigs.forEach((conf, i) => {
        if (conf.pd === "N/A") {
            hiddenRows.push(i);
        }
    });
    localStorage.setItem("hiddenDomeRows", JSON.stringify(hiddenRows));
    
    // Refresh table and controls
    const body = document.getElementById("tableBody");
    const rows = body.querySelectorAll("tr");
    rows.forEach(row => {
        const id = parseInt(row.getAttribute("data-id"));
        if (hiddenRows.includes(id)) {
            row.style.display = "none";
        } else {
            row.style.display = "";
        }
    });
    
    generateVisibilityControls();
}

function showAllDomes() {
    localStorage.setItem("hiddenDomeRows", JSON.stringify([]));
    
    // Refresh table and controls
    const body = document.getElementById("tableBody");
    const rows = body.querySelectorAll("tr");
    rows.forEach(row => {
        row.style.display = "";
    });
    
    generateVisibilityControls();
}

function onRowMaterialChange(rowIndex) {
    const r = document.querySelector(`tr[data-id="${rowIndex}"]`);
    const sel = r.querySelector(".s-mat-sel");
    let storedSelections = JSON.parse(localStorage.getItem("rowMaterialSelections") || "{}");
    storedSelections[rowIndex] = sel.value;
    localStorage.setItem("rowMaterialSelections", JSON.stringify(storedSelections));
    calcRow(rowIndex);
}

function debounce(i, type) {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => calcRow(i, type), UPDATE_DELAY);
}

function parsePrice(el) {
    return parseFloat(el.innerText.replace(/[$,]/g, "")) || 0;
}

function calcRow(i, trigger) {
    const r = document.querySelector(`tr[data-id="${i}"]`);
    if (!r) return;
    const conf = domeConfigs[i];
    const radiusMM = conf.radiusMM;
    const activeUnit = document.getElementById("unitSelect")?.value || "ft";

    const hDiag = document.getElementById("head-diag");
    const hSheet = document.getElementById("head-sheet");
    if (hDiag) hDiag.innerHTML = `The Diagonal <br> (${activeUnit})`;
    if (hSheet) hSheet.innerHTML = `Sheet Size <br> (Material)`;

    // === Update Prices from Global Settings if not actively editing ===
    const cSel = r.querySelector(".c-sel");
    const tubeSize = cSel.value; // "1/2", "3/4", "1", "1.25"
    let conduitPrice = 0;
    if (tubeSize === "1/2") conduitPrice = parseFloat(document.getElementById("priceEMT12").value);
    else if (tubeSize === "3/4") conduitPrice = parseFloat(document.getElementById("priceEMT34").value);
    else if (tubeSize === "1") conduitPrice = parseFloat(document.getElementById("priceEMT1").value);
    else if (tubeSize === "1.25") conduitPrice = parseFloat(document.getElementById("priceEMT125").value);
    
    const boltPrice = parseFloat(document.getElementById("priceBolt").value);
    const nutPrice = parseFloat(document.getElementById("priceNut").value);

    // Only update cell text if not currently focused (user override)
    if (document.activeElement !== r.querySelector(".c-p")) r.querySelector(".c-p").innerText = `$${conduitPrice.toFixed(2)}`;
    if (document.activeElement !== r.querySelector(".b-p")) r.querySelector(".b-p").innerText = `$${boltPrice.toFixed(2)}`;
    if (document.activeElement !== r.querySelector(".n-p")) r.querySelector(".n-p").innerText = `$${nutPrice.toFixed(2)}`;

    // Data Management
    const matSel = r.querySelector(".s-mat-sel");
    let matIndex = matSel.value;
    if (matIndex === "default") {
        matIndex = document.getElementById("panelMaterialSelect").value;
    }
    const mat = panelMaterials[matIndex];
    
    // Width is always used for the "fits on sheet" logic
    let currentSheetMM = 1219.2; // 4ft Default
    if (mat && mat.width) {
        currentSheetMM = mat.width * 304.8;
    }

    // Constraints logic
    const COS30 = 0.866025;
    const maxC2CFromSheetMM = currentSheetMM / COS30; // New limit based on Fusion 360 sketch
    const maxE2EMM = maxC2CFromSheetMM + (2 * STRUT_HOLE_OFFSET_MM);

    // Frequency Auto-Selection (Only auto-adjust when material constraints change or initial load)
    const optMode = document.getElementById("freqOptimizeSelect").value;
    localStorage.setItem("freqOptimizationPreference", optMode);

    let currentFreq = r.querySelector(".f-sel").value;
    if (trigger === "init") {
        const freqKeys = Object.keys(freqData);
        const startIndex = freqKeys.indexOf(conf.baseFreq);
        let bestFreq = null;
        let minPrice = Infinity;

        for (let j = startIndex; j < freqKeys.length; j++) {
            let key = freqKeys[j];
            let data = freqData[key];
            
            // 1. Check Fit
            let actualMaxR = 0;
            for(let p in data.parts) { if(data.parts[p].r > actualMaxR) actualMaxR = data.parts[p].r; }
            let neededMaxE2E = (radiusMM * actualMaxR) + (2 * STRUT_HOLE_OFFSET_MM);
            
            if (neededMaxE2E <= maxE2EMM + 0.1) {
                if (optMode === "freq") {
                    bestFreq = key; // Found lowest freq that fits
                    break; 
                } else {
                    // Lowest Price Mode - Calculate hypothetical cost
                    let tempTubes = 0;
                    for (let label in data.parts) {
                        const len = (radiusMM * data.parts[label].r) + (2 * STRUT_HOLE_OFFSET_MM);
                        tempTubes += Math.ceil(data.parts[label].qty / (Math.floor(CONDUIT_TUBE_LENGTH_MM / len) || 1));
                    }
                    const tempCost = (tempTubes * conduitPrice) + (data.bolts * (boltPrice + nutPrice));
                    if (tempCost < minPrice) {
                        minPrice = tempCost;
                        bestFreq = key;
                    }
                }
            }
        }
        if (!bestFreq) bestFreq = freqKeys[freqKeys.length - 1];
        currentFreq = bestFreq;
        r.querySelector(".f-sel").value = currentFreq;

        // Auto-select smallest safe conduit on init
        const initData = freqData[currentFreq];
        let initMaxR = 0;
        for (let p in initData.parts) { if (initData.parts[p].r > initMaxR) initMaxR = initData.parts[p].r; }
        const initLongestE2E = (radiusMM * initMaxR) + (2 * STRUT_HOLE_OFFSET_MM);
        cSel.value = getSmallestSafeConduit(initLongestE2E);
    }

    // Calculate The Diagonal based on current frequency
    const activeData = freqData[currentFreq];
    let maxRForDiag = 0;
    for (let p in activeData.parts) { if (activeData.parts[p].r > maxRForDiag) maxRForDiag = activeData.parts[p].r; }
    let longestStrutC2C = radiusMM * maxRForDiag;
    let calculatedDiagMM = longestStrutC2C * PHI;
    
    const diagEl = r.querySelector(".diag");
    if (diagEl) {
        diagEl.setAttribute("data-mm", calculatedDiagMM);
        diagEl.innerText = formatFromMM(calculatedDiagMM);
    }

    // --- Conduit Safety Check ---
    const longestStrutE2E = longestStrutC2C + (2 * STRUT_HOLE_OFFSET_MM);
    const safeLimit = CONDUIT_SAFETY_LIMITS[tubeSize];
    
    if (longestStrutE2E > safeLimit) {
        cSel.style.backgroundColor = "#500"; // Dark red for visibility against dark theme
        cSel.style.color = "#f44";
        cSel.style.borderColor = "#f44";
    } else {
        cSel.style.backgroundColor = "";
        cSel.style.color = "";
        cSel.style.borderColor = "";
    }

    const swEl = r.querySelector(".s-w");
    if (swEl) {
        swEl.setAttribute("data-mm", currentSheetMM);
        if (document.activeElement !== swEl) {
            swEl.innerText = formatFromMM(currentSheetMM);
        }
    }

    // --- Strut Listing & Sorting ---
    const sortMode = document.getElementById("strutSortSelect").value;
    localStorage.setItem("strutSortPreference", sortMode);

    const data = freqData[currentFreq];
    
    // Prepare parts array with calculated lengths
    let partsArr = Object.entries(data.parts).map(([label, d]) => ({
        label,
        qty: d.qty,
        r: d.r,
        len: (radiusMM * d.r) + (2 * STRUT_HOLE_OFFSET_MM)
    }));

    // Apply Sorting
    if (sortMode === "length") {
        partsArr.sort((a, b) => a.len - b.len); // Shortest to Longest
    } else {
        partsArr.sort((a, b) => a.label.localeCompare(b.label)); // Alphabetical (A-Z)
    }

    let sHtml = "";
    partsArr.forEach(p => {
        let isOver = p.len > maxE2EMM + 0.5;
        let errorClass = isOver ? "price-red" : "";
        let tooltipAttr = isOver ? "data-tooltip-id=\"TOOLTIP_WHY_RED\"" : "";
        
        // Visualizer Eye
        let eyeIcon = `<span class="vis-eye" style="cursor:pointer; margin-left:5px;" onmouseenter="showVisualizer(this, ${p.len})" onmouseleave="hideVisualizer()">👁</span>`;

        sHtml += `<span class="${errorClass}" data-tooltip-id="${isOver ? 'TOOLTIP_COLUMN_WHY_RED' : ''}" style="${isOver ? "cursor:help" : ""}">${p.qty} x ${formatFromMM(p.len)} (${p.label})</span>${eyeIcon}<br>`;
    });
    const sListEl = r.querySelector(".s-list");
    if (sListEl) sListEl.innerHTML = `<div class="strut-display">${sHtml}</div>`;

    let totalTubes = 0;
    for (let label in data.parts) {
        const lenE2EMM = (radiusMM * data.parts[label].r) + (2 * STRUT_HOLE_OFFSET_MM);
        const strutsPerTube = Math.floor(CONDUIT_TUBE_LENGTH_MM / lenE2EMM) || 1;
        totalTubes += Math.ceil(data.parts[label].qty / strutsPerTube);
    }

    const ttEl = r.querySelector(".t-t");
    const tsEl = r.querySelector(".t-s");
    const thEl = r.querySelector(".t-h");
    if (ttEl) ttEl.innerText = totalTubes;
    if (tsEl) tsEl.innerText = data.struts;
    if (thEl) thEl.innerText = data.bolts;

    // --- Panel Cost Calculation ---
    const radiusFt = radiusMM / 304.8; 
    const surfaceAreaSqFt = 2 * Math.PI * radiusFt * radiusFt; // Approx Hemisphere area
    // Use the already resolved mat/matIndex from the top of calcRow
    let panelCost = 0;
    if (mat) {
        const waste = mat.waste || 1.15; // Default 15% waste if undefined
        const sheetsNeeded = Math.ceil((surfaceAreaSqFt / mat.areaSqFt) * waste);
        panelCost = sheetsNeeded * mat.price;
        
        // Calculate Total Panels (Approx Hemisphere)
        const vNum = parseInt(currentFreq.replace("V", "")) || 1;
        const approxPanels = Math.ceil((20 * vNum * vNum) / 2);

        // Unit Label
        let unitLabel = "sheets";
        if (mat.type === 'roll') unitLabel = "rolls";

        // Detailed tooltip for panel cost
        const tipText = `<b>Panel Estimation:</b>
        <br>• Dome Surface Area: ${Math.round(surfaceAreaSqFt)} sqft
        <br>• Sheet Area: ${mat.areaSqFt} sqft
        <br>• Waste Factor: ${Math.round((waste-1)*100)}%
        <br>• Est. ${unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}: ${sheetsNeeded}
        <br>• Est. Panels (1/2 Dome): ~${approxPanels}`;
        
        r.querySelector(".p-cost").innerHTML = `
            $${panelCost.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
            <br><span style="font-size:0.8em; color:#AAA">(${sheetsNeeded} ${unitLabel})</span>
            <br><span style="font-size:0.8em; color:#AAA">(~${approxPanels} panels)</span>
        `;
        r.querySelector(".p-cost").setAttribute("data-tooltip", tipText);
    }
    // ------------------------------

    const frameCost = (parsePrice(r.querySelector(".c-p")) * totalTubes) + (data.bolts * (parsePrice(r.querySelector(".b-p")) + parsePrice(r.querySelector(".n-p"))));
    const totalCell = r.querySelector(".diy-total-cell");
    totalCell.innerText = `$${frameCost.toLocaleString(undefined, {minimumFractionDigits:2})}`;

    const frameAndPanel = frameCost + panelCost;
    r.querySelector(".fp-total").innerText = `$${frameAndPanel.toLocaleString(undefined, {minimumFractionDigits:2})}`;

    const pdPrice = parseFloat(conf.pd.split(" ")[0].replace(/[$,]/g, ""));
    const threshold = parseFloat(document.getElementById("savingsThreshold").value) / 100;
    if (totalCell) {
        totalCell.classList.remove("price-red", "price-green", "price-white");
        if (frameCost > pdPrice) totalCell.classList.add("price-red");
        else if (frameCost <= pdPrice * (1 - threshold)) totalCell.classList.add("price-green");
        else totalCell.classList.add("price-white");
        totalCell.setAttribute("data-tooltip-id", "TOOLTIP_COLUMN_SAVINGS");
    }
}

function initTooltip() {
    const tooltip = document.getElementById("customTooltip");
    let hideTimer = null; // Renamed to avoid confusion with existing clearTimeout(hideTimeout)

    const showTooltip = (target, mouseEvent) => {
        clearTimeout(hideTimer); // Clear any pending hide
        const tipId = target.getAttribute("data-tooltip-id");
        const tipText = tipId ? TOOLTIP_MAP[tipId] : target.getAttribute("data-tooltip");
        if (tipText) {
            tooltip.innerHTML = tipText;
            tooltip.style.display = "block";
            
            let left = mouseEvent.pageX;
            let top = mouseEvent.pageY;
            
            // Keep it on screen
            if (left + tooltip.offsetWidth > window.innerWidth) {
                left = window.innerWidth - tooltip.offsetWidth - 20;
            }
            if (top + tooltip.offsetHeight > window.innerHeight + window.scrollY) {
                top = mouseEvent.pageY - tooltip.offsetHeight; // Show above cursor
            }

            tooltip.style.left = left + "px";
            tooltip.style.top = top + "px";
        }
    };

    const startHideTimer = () => {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            tooltip.style.display = "none";
        }, 333); 
    };

    // Use event delegation for elements that trigger tooltips
    document.addEventListener("mouseover", (e) => {
        const target = e.target.closest("[data-tooltip], [data-tooltip-id]");
        if (target) {
            showTooltip(target, e);
        }
    });

    document.addEventListener("mouseout", (e) => {
        const target = e.target.closest("[data-tooltip], [data-tooltip-id]");
        // If leaving a target AND NOT entering the tooltip
        if (target && !tooltip.contains(e.relatedTarget)) {
            startHideTimer();
        }
    });

    // Explicit listeners for the tooltip element itself
    tooltip.addEventListener("mouseenter", () => {
        clearTimeout(hideTimer);
    });

    tooltip.addEventListener("mouseleave", () => {
        startHideTimer();
    });

    // Observer to handle dynamic content (Strut items)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        node.querySelectorAll("[data-tooltip]:not([data-has-tooltip]), [data-tooltip-id]:not([data-has-tooltip])").forEach(el => {
                            el.addEventListener("mouseenter", (e) => showTooltip(el, e));
                            el.addEventListener("mouseleave", (e) => {
                                if (!tooltip.contains(e.relatedTarget)) {
                                    startHideTimer();
                                }
                            });
                            el.dataset.hasTooltip = "true"; // Mark as attached
                        });
                    }
                });
            }
        });
    });
    observer.observe(document.getElementById("tableBody"), { childList: true, subtree: true });

    // Initial attachment for static tooltips (like header cells outside tableBody)
    document.querySelectorAll("[data-tooltip]:not([data-has-tooltip]), [data-tooltip-id]:not([data-has-tooltip])").forEach(el => {
        el.addEventListener("mouseenter", (e) => showTooltip(el, e));
        el.addEventListener("mouseleave", (e) => {
            if (!tooltip.contains(e.relatedTarget)) {
                startHideTimer();
            }
        });
        el.dataset.hasTooltip = "true"; // Mark as attached
    });
}

function showVisualizer(el, strutLenMM) {
    const visualizer = document.getElementById("customVisualizer");
    const row = el.closest('tr');
    const matSel = row.querySelector(".s-mat-sel");
    let matIdx = matSel.value;
    if (matIdx === "default") {
        matIdx = document.getElementById("panelMaterialSelect").value;
    }
    const mat = panelMaterials[matIdx];
    
    if (!mat || mat.type === 'unit') {
        visualizer.innerHTML = "<h4>Visualizer</h4><p style='color:#AAA; font-size:0.8em;'>Select a Sheet or Roll material<br>to see the cut diagram.</p>";
    } else {
        const sheetW = mat.width || 4;
        const sheetL = mat.length || 8;
        const sFt = strutLenMM / 304.8;
        
        const COS30 = 0.866025;
        const SIN30 = 0.5;
        
        const maxStrutAllowed = sheetW / COS30;
        const mainFits = sFt <= maxStrutAllowed + 0.01;
        const strokeColor = mainFits ? "#0FF" : "#F44";

        const maxCanvasSize = 250;
        const scale = maxCanvasSize / Math.max(sheetW, sheetL);
        const canvasW = sheetW * scale;
        const canvasL = sheetL * scale;
        const s = sFt * scale;
        const colW = s * COS30;
        const triHeightFt = sFt * COS30;

        let gridHtml = "";
        
        // Helper: Check if points are in bounds
        const checkPoints = (pts) => {
            let out = false;
            pts.forEach(p => {
                if (p.x < -0.1 || p.x > canvasW + 0.1 || p.y < -0.1 || p.y > canvasL + 0.1) out = true;
            });
            return out;
        };
        const isAllOut = (pts) => {
            return pts.every(p => p.x < -0.1 || p.x > canvasW + 0.1 || p.y < -0.1 || p.y > canvasL + 0.1);
        };

        // Loop to fill grid
        for (let ix = 0; ix < canvasW + colW; ix += colW) {
            for (let iy = -s; iy < canvasL + s; iy += s) {
                // Triangle 1 (Facing Right)
                const t1 = [{x: ix, y: iy}, {x: ix + colW, y: iy + s/2}, {x: ix, y: iy + s}];
                if (!isAllOut(t1)) {
                    const isRed = checkPoints(t1);
                    const color = isRed ? "#F44" : "#0FF";
                    gridHtml += `<path d="M ${t1[0].x},${t1[0].y} L ${t1[1].x},${t1[1].y} L ${t1[2].x},${t1[2].y} Z" fill="rgba(0,255,255,0.05)" stroke="${color}" stroke-width="1" ${isRed ? 'stroke-dasharray="2,2"' : ''} />`;
                    
                    // Add height indicator for the very first triangle (Top-Left)
                    if (ix === 0 && (iy >= -0.1 && iy <= 0.1)) {
                        gridHtml += `<line x1="${t1[1].x}" y1="${t1[1].y}" x2="${t1[0].x}" y2="${t1[1].y}" stroke="#FFF" stroke-width="1.5" stroke-dasharray="3,3" />`;
                    }
                }

                // Triangle 2 (Facing Left - Nested)
                const t2 = [{x: ix + colW, y: iy + s/2}, {x: ix, y: iy + s}, {x: ix + colW, y: iy + s + s/2}];
                if (!isAllOut(t2)) {
                    const isRed = checkPoints(t2);
                    const color = isRed ? "#F44" : "#0FF";
                    gridHtml += `<path d="M ${t2[0].x},${t2[0].y} L ${t2[1].x},${t2[1].y} L ${t2[2].x},${t2[2].y} Z" fill="none" stroke="${color}" stroke-width="1" opacity="0.3" stroke-dasharray="${isRed ? '2,2' : '1,1'}" />`;
                }
            }
        }

        visualizer.innerHTML = `
            <h4>Panel Cut Preview</h4>
            <div style="margin-bottom:10px; color:${strokeColor}; font-weight:bold; font-size:0.9em;">${mainFits ? "FITS ON SHEET" : "OUT OF BOUNDS"}</div>
            <svg width="${canvasW}" height="${canvasL}" style="border:1px solid #333; background:#050505;">
                <rect x="0" y="0" width="${canvasW}" height="${canvasL}" fill="#111" />
                ${gridHtml}
                <rect x="0" y="0" width="${canvasW}" height="${canvasL}" fill="none" stroke="#555" stroke-width="1" />
            </svg>
            <div style="margin-top:10px; font-size:0.8em; color:#AAA;">
                Sheet: ${Math.round(sheetW * 100) / 100}' x ${Math.round(sheetL * 100) / 100}'<br>
                Triangle side: ${sFt.toFixed(2)}'<br>
                Triangle height: ${triHeightFt.toFixed(2)}'<br>
                Max side allowed: ${maxStrutAllowed.toFixed(2)}'
            </div>
            <div style="font-size:0.7em; color:#0FF; margin-top:5px; border-top:1px solid #222; padding-top:5px;">
                Culling inactive triangles & strict collision detection enabled.
            </div>
        `;
    }

    const rect = el.getBoundingClientRect();
    visualizer.style.display = "block";
    
    // Position tooltip safely
    let left = rect.right + 15;
    if (left + 270 > window.innerWidth) {
        left = rect.left - 280;
    }
    
    let top = rect.top + window.scrollY - 50;
    // Prevent cutting off at bottom
    visualizer.style.display = "block"; // Must be block to get offsetHeight
    if (top + visualizer.offsetHeight > window.innerHeight + window.scrollY) {
        top = (rect.bottom + window.scrollY) - visualizer.offsetHeight;
    }
    // Prevent cutting off at top
    if (top < window.scrollY) top = window.scrollY + 10;

    visualizer.style.left = (left + window.scrollX) + "px";
    visualizer.style.top = top + "px";
}

function hideVisualizer() {
    document.getElementById("customVisualizer").style.display = "none";
}

window.onload = render;
