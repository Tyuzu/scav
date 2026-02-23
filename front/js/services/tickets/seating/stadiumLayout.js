// ==============================
// Stadium Layout Generator
// ==============================

// --- Configurable defaults ---
const defaultPriceRanges = [
  { min: 0, max: 100, color: "#2ecc71" },
  { min: 101, max: 200, color: "#009c3e" },
  { min: 201, max: 300, color: "#9b59b6" },
  { min: 301, max: 400, color: "#e67e22" }
];

// --- Utility: Degrees → Radians ---
const degToRad = Math.PI / 180;

function polarToCartesian(cx, cy, radius, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180; // shift rotation
  return {
    x: cx + Math.cos(rad) * radius,
    y: cy + Math.sin(rad) * radius
  };
}


// // --- Utility: Polar → Cartesian ---
// function polarToCartesian(cx, cy, radius, angleDeg) {
//   const rad = angleDeg * degToRad;
//   return {
//     x: cx + Math.cos(rad) * radius,
//     y: cy + Math.sin(rad) * radius
//   };
// }

// --- Utility: Generate Excel-like Row Labels (A, B, C ... AA, AB, etc.) ---
function generateRowLabel(index) {
  let label = '';
  let n = index + 1;
  while (n > 0) {
    n--;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
}

// --- Geometry: Generate Walkways ---
function generateWalkways(sections, startAngle, angleRange, centerX, centerY, innerRadius, maxRadius) {
  const midRadius = innerRadius + (maxRadius - innerRadius) / 2;
  const walkways = [];
  for (let s = 0; s < sections; s++) {
    const a1 = startAngle + s * angleRange;
    const a2 = a1 + angleRange;
    const p1 = polarToCartesian(centerX, centerY, midRadius, a1);
    const p2 = polarToCartesian(centerX, centerY, midRadius, a2);
    walkways.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
  }
  return walkways;
}

// --- Geometry: Stage / Screen / Structures ---
function createStage(centerX, centerY) {
  return { x: centerX, y: centerY - 50, width: 400, height: 40, rx: 6 };
}

function createScreen(centerX, centerY) {
  return { x: centerX, y: centerY - 200, width: 200, height: 60 };
}

function createCranes(centerX, centerY) {
  return [
    { x: centerX - 150, y: centerY - 100, width: 20, height: 150 },
    { x: centerX + 120, y: centerY - 120, width: 20, height: 160 }
  ];
}

function createEntries(centerX, centerY, maxRadius) {
  return [
    { x: centerX - maxRadius, y: centerY, width: 60, height: 20 },
    { x: centerX + maxRadius - 60, y: centerY, width: 60, height: 20 }
  ];
}

// --- Logic: Seat obstruction ---
function isSeatObstructed(cx, cy, cranes) {
  return cranes.some(c => {
    const centerX = c.x + c.width / 2;
    const centerY = c.y + c.height / 2;
    const dx = cx - centerX;
    const dy = cy - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < Math.max(c.width, c.height) / 1.2;
  });
}

// --- Optional deterministic randomness (stable seat distribution) ---
function seededRandom(seed = 1) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generateStadiumLayout(opts = {}) {
  const {
    sections = 8,
    rowsPerSection = 12,
    seatsPerRow = 24,
    centerX = 600,
    centerY = 850,
    startAngle = -90,
    endAngle = 90,
    priceBase = 70,
    currency = "USD",
    innerRadius = 80,
    maxRadius = 500,
    priceRanges = defaultPriceRanges,
    desiredSeatSpacing = 50, // new: target distance between seats
    seed = Date.now()
  } = opts;

  if (sections <= 0 || rowsPerSection <= 0 || seatsPerRow <= 0)
    throw new Error("Invalid stadium configuration.");

  const width = centerX * 2;
  const height = centerY * 2;
  const angleRange = (endAngle - startAngle) / sections;

  const cranes = createCranes(centerX, centerY);
  const entries = createEntries(centerX, centerY, maxRadius);
  const walkways = generateWalkways(sections, startAngle, angleRange, centerX, centerY, innerRadius, maxRadius);

  // --- Horizontal layout fix ---
  function polarToCartesian(cx, cy, radius, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return {
      x: cx + Math.cos(rad) * radius,
      y: cy + Math.sin(rad) * radius
    };
  }

  // --- Sections ---
  const sectionsData = Array.from({ length: sections }, (_, s) => {
    const sectionId = `SEC-${s + 1}`;
    const sectionName = `Section ${s + 1}`;
    const angleStart = startAngle + s * angleRange;
    const angleEnd = angleStart + angleRange;

    const rows = Array.from({ length: rowsPerSection }, (_, r) => {
      const rowId = generateRowLabel(r);
      const rowRadius = innerRadius + ((maxRadius - innerRadius) * r) / (rowsPerSection - 1);

      // --- Dynamic seats based on arc length ---
      const arcLength = 2 * Math.PI * rowRadius * (angleRange / 360);
      let seatsInThisRow = Math.max(4, Math.floor(arcLength / desiredSeatSpacing)); // min 4 seats

      // Clamp to approximate global seatsPerRow if needed
      seatsInThisRow = Math.min(seatsInThisRow, seatsPerRow * 1.5);

      const seats = Array.from({ length: seatsInThisRow }, (_, i) => {
        const t = i / (seatsInThisRow - 1);
        const angle = (1 - t) * angleStart + t * angleEnd;
        const { x: cx, y: cy } = polarToCartesian(centerX, centerY, rowRadius, angle);

        const isOb = isSeatObstructed(cx, cy, cranes);
        const price = priceBase + (rowsPerSection - r) * 20;
        const soldChance = seededRandom(seed + s * 1000 + r * 100 + i) < 0.1;

        return {
          id: `${sectionId}-${rowId}-${i + 1}`,
          label: i + 1,
          cx,
          cy,
          price,
          obstructed: isOb,
          status: soldChance ? "sold" : "available",
          currency
        };
      });

      return { id: rowId, index: r + 1, seats };
    });

    return { id: sectionId, name: sectionName, rows };
  });

  return {
    width,
    height,
    sections: sectionsData,
    priceRanges,
    currency,
    stage: createStage(centerX, centerY),
    screen: createScreen(centerX, centerY),
    cranes,
    entries,
    walkways
  };
}

