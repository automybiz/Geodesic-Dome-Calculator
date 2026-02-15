const UPDATE_DELAY = 333;
const PHI = 1.618034; 
const CONDUIT_TUBE_LENGTH_MM = 3048; // 10 Feet in mm
const STRUT_HOLE_OFFSET_MM = 19.05; // 3/4 inch in mm
let updateTimeout;

const TOOLTIP_SAVINGS = `Adjust the Savings Threshold (%) you want to save compared to the Pacific Domes prices. This affects the Color Coding in the DIY Price column.
<ul>
    <li>RED for Prices ABOVE the Pacific Domes Price</li>
    <li>WHITE for Prices BELOW the Pacific Domes Price</li>
    <li>GREEN for Prices BELOW the Savings Threshold (%)</li>
</ul>`;

const TOOLTIP_DIY_FREQ = `Frequency (V) indicates how many times the triangles of a 1V dome (icosahedron) are subdivided.
<ul>
    <li>Higher "V" = smaller panels but more struts.</li>
    <li>Larger domes require higher frequencies to keep individual panels small enough for 4x4 material.</li>
</ul>`;

const TOOLTIP_DIAGONAL = `The maximum width of your pentagonal panel cluster (from your Fusion 360 sketch).
<ul>
    <li>Supports mm, cm, m, in, ft (e.g., 4\\
 2" or 1250mm).</li>
    <li>Used to constrain the dome for standard material sizes (e.g., 4x4 plywood).</li>
    <li><b>Pacific Domes Reference:</b> Their 16\\
 to 24\\
 (2V/3V) domes typically use diagonals ranging from 96" to 144" (2438mm to 3658mm).</li>
</ul>`;

const TOOLTIP_MAX_STRUT = `Calculated as (Diagonal \u00f7 1.618) + (2 * Hole Offset). This represents the absolute maximum END-TO-END length that can fit on your chosen material diagonal.`;

const TOOLTIP_STRUT_LEN = `The end to end length of the conduit strut.
<ul>
    <li><b>Standard:</b> Physical tip to physical tip.</li>
    <li><b>Hole Offset:</b> Includes 3/4" (19.05mm) offset on each end.</li>
    <li><b>Warning (RED):</b> Exceeds your Max Strut Length (Material Limit).</li>
    <li><b>Conflict Resolution:</b> Increase Frequency (V) or Sheet Size.</li>
    <li><b>Fractions:</b> Imperial modes use precise 1/16th construction fractions.</li>
</ul>`;

const TOOLTIP_BASE_FREQ = `The lowest frequency recommended for structural stability at that dome size.`;

const TOOLTIP_WHY_RED = `<b>MATERIAL CONFLICT:</b> This strut is too long to be cut from the specified material diagonal. 
<ul>
    <li>Check your "Diagonal" input (Material Size).</li>
    <li>Increase the "DIY Frequency" to subdivide panels further.</li>
    <li>Current strut exceeds the physical sheet limit by the amount shown.</li>
</ul>`;

const TOOLTIP_MAP = {
    TOOLTIP_SAVINGS,
    TOOLTIP_DIY_FREQ,
    TOOLTIP_DIAGONAL,
    TOOLTIP_MAX_STRUT,
    TOOLTIP_STRUT_LEN,
    TOOLTIP_BASE_FREQ,
    TOOLTIP_WHY_RED
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

const domeConfigs = [
    { size: "16\" (5m)", radiusMM: 2438.4, pd: "$1,750 (2V)", baseFreq: "3V" },
    { size: "20\" (6m)", radiusMM: 3048, pd: "$2,800 (2V/3V)", baseFreq: "3V" },
    { size: "24\" (7m)", radiusMM: 3657.6, pd: "$3,250 (3V)", baseFreq: "3V" },
    { size: "30\" (9m)", radiusMM: 4572, pd: "$4,200 (3V)", baseFreq: "3V" },
    { size: "36\" (11m)", radiusMM: 5486.4, pd: "$6,600 (4V)", baseFreq: "4V" },
    { size: "44\" (13m)", radiusMM: 6705.6, pd: "$12,950 (4V)", baseFreq: "4V" },
    { size: "50\" (15m)", radiusMM: 7620, pd: "$15,000 (4V)", baseFreq: "4V" }
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
        const inchMatch = inchPart.match(/([\d.]+)/);
        if (inchMatch) totalInches += parseFloat(inchMatch[1]);
        if (!ftMatch && !fracMatch && !inchMatch) {
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

function handleEnter(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        e.target.blur();
    }
}

function finalizeField(i, type) {
    calcRow(i, type);
}

function recalcAll() {
    domeConfigs.forEach((_, i) => calcRow(i));
}

function render() {
    const body = document.getElementById("tableBody");
    body.innerHTML = "";
    domeConfigs.forEach((conf, i) => {
        const row = document.createElement("tr");
        row.setAttribute("data-id", i);
        row.innerHTML = `
            <td>${conf.size}</td>
            <td>${conf.pd}</td>
            <td><select class="f-sel" onchange="calcRow(${i}, 'manual')">
                <option value="1V">1V</option><option value="2V">2V</option><option value="3V">3V</option>
                <option value="4V">4V</option><option value="5V">5V</option><option value="6V">6V</option>
                <option value="7V">7V</option><option value="8V">8V</option>
            </select></td>
            <td><select class="c-sel" onchange="calcRow(${i})">
                <option value="1/2">1/2" EMT</option><option value="3/4">3/4" EMT</option>
                <option value="1" selected>1" EMT</option><option value="1.25">1.25" EMT</option>
            </select></td>
            <td contenteditable="true" class="c-p" onkeyup="debounce(${i})">$18.20</td>
            <td contenteditable="true" class="diag" onkeyup="debounce(${i}, 'diag')" onblur="finalizeField(${i}, 'diag')" onkeydown="handleEnter(event)"></td>
            <td contenteditable="true" class="max-s" onkeyup="debounce(${i}, 'maxs')" onblur="finalizeField(${i}, 'maxs')" onkeydown="handleEnter(event)"></td>
            <td class="s-list"></td>
            <td class="t-t"></td>
            <td class="t-s"></td>
            <td class="t-h"></td>
            <td contenteditable="true" class="b-p" onkeyup="debounce(${i})">$0.85</td>
            <td contenteditable="true" class="n-p" onkeyup="debounce(${i})">$0.45</td>
            <td class="diy-total-cell"></td>
        `;
        body.appendChild(row);
        row.querySelector(".f-sel").value = conf.baseFreq;
        row.querySelector(".diag").setAttribute("data-mm", 1219.2);
        calcRow(i); 
    });
    initTooltip();
    document.getElementById("globalSettings").setAttribute("data-tooltip", TOOLTIP_SAVINGS);
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
    const conf = domeConfigs[i];
    const radiusMM = conf.radiusMM;
    const activeUnit = document.getElementById("unitSelect")?.value || "ft";

    const hDiag = document.getElementById("head-diag");
    const hMaxs = document.getElementById("head-maxs");
    if (hDiag) hDiag.innerText = `The Diagonal (${activeUnit})`;
    if (hMaxs) hMaxs.innerText = `Max Strut Length (${activeUnit})`;

    let currentDiagMM = parseFloat(r.querySelector(".diag").getAttribute("data-mm")) || 1219.2;
    let maxC2CMM = currentDiagMM / PHI;

    if (trigger === "diag") {
        let inputMM = parseToMM(r.querySelector(".diag").innerText);
        if (inputMM !== null) {
            currentDiagMM = inputMM;
            maxC2CMM = currentDiagMM / PHI;
        }
    } else if (trigger === "maxs") {
        let inputMM = parseToMM(r.querySelector(".max-s").innerText);
        if (inputMM !== null) {
            maxC2CMM = inputMM - (2 * STRUT_HOLE_OFFSET_MM);
            currentDiagMM = maxC2CMM * PHI;
        }
    }

    let maxE2EMM = maxC2CMM + (2 * STRUT_HOLE_OFFSET_MM);

    // Frequency Auto-Selection
    let currentFreq = r.querySelector(".f-sel").value;
    if (trigger === "diag" || trigger === "maxs" || !trigger) {
        const freqKeys = Object.keys(freqData);
        const startIndex = freqKeys.indexOf(conf.baseFreq);
        let foundFreq = null;
        for (let j = startIndex; j < freqKeys.length; j++) {
            let key = freqKeys[j];
            let data = freqData[key];
            let actualMaxR = 0;
            for(let p in data.parts) { if(data.parts[p].r > actualMaxR) actualMaxR = data.parts[p].r; }
            let neededMaxE2E = (radiusMM * actualMaxR) + (2 * STRUT_HOLE_OFFSET_MM);
            if (neededMaxE2E <= maxE2EMM + 0.1) {
                foundFreq = key;
                break;
            }
        }
        if (!foundFreq) foundFreq = freqKeys[freqKeys.length - 1];
        currentFreq = foundFreq;
        r.querySelector(".f-sel").value = currentFreq;
    }

    r.querySelector(".diag").setAttribute("data-mm", currentDiagMM);
    if (document.activeElement !== r.querySelector(".diag")) {
        r.querySelector(".diag").innerText = formatFromMM(currentDiagMM);
    }
    if (document.activeElement !== r.querySelector(".max-s")) {
        r.querySelector(".max-s").innerText = formatFromMM(maxE2EMM);
    }

    const data = freqData[currentFreq];
    let sHtml = "";
    for (let label in data.parts) {
        let lenE2EMM = (radiusMM * data.parts[label].r) + (2 * STRUT_HOLE_OFFSET_MM);
        let isOver = lenE2EMM > maxE2EMM + 0.5;
        let errorClass = isOver ? "price-red" : "";
        let tooltipAttr = isOver ? "data-tooltip-id=\"TOOLTIP_WHY_RED\"" : "";
        sHtml += `<span class="${errorClass}" ${tooltipAttr} style="${isOver ? "cursor:help" : ""}">${data.parts[label].qty} x ${formatFromMM(lenE2EMM)} (${label})</span><br>`;
    }
    r.querySelector(".s-list").innerHTML = `<div class="strut-display">${sHtml}</div>`;

    let totalTubes = 0;
    for (let label in data.parts) {
        const lenE2EMM = (radiusMM * data.parts[label].r) + (2 * STRUT_HOLE_OFFSET_MM);
        const strutsPerTube = Math.floor(CONDUIT_TUBE_LENGTH_MM / lenE2EMM) || 1;
        totalTubes += Math.ceil(data.parts[label].qty / strutsPerTube);
    }

    r.querySelector(".t-t").innerText = totalTubes;
    r.querySelector(".t-s").innerText = data.struts;
    r.querySelector(".t-h").innerText = data.bolts;

    const total = (parsePrice(r.querySelector(".c-p")) * totalTubes) + (data.bolts * (parsePrice(r.querySelector(".b-p")) + parsePrice(r.querySelector(".n-p"))));
    const totalCell = r.querySelector(".diy-total-cell");
    totalCell.innerText = `$${total.toLocaleString(undefined, {minimumFractionDigits:2})}`;

    const pdPrice = parseFloat(conf.pd.split(" ")[0].replace(/[$,]/g, ""));
    const threshold = parseFloat(document.getElementById("savingsThreshold").value) / 100;
    totalCell.classList.remove("price-red", "price-green", "price-white");
    if (total > pdPrice) totalCell.classList.add("price-red");
    else if (total <= pdPrice * (1 - threshold)) totalCell.classList.add("price-green");
    else totalCell.classList.add("price-white");
    totalCell.setAttribute("data-tooltip-id", "TOOLTIP_SAVINGS");
}

function toggleLegend() {
    const content = document.getElementById("legendContent");
    content.style.display = (content.style.display === "block") ? "none" : "block";
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

window.onload = render;