const fs = require('fs');
const path = require('path');

// File paths
const colorTokensPath = path.join(__dirname, 'color-tokens.json');
const designTokensPath = path.join(__dirname, 'design-tokens.tokens.json');

// Read and parse JSON files
if (!fs.existsSync(colorTokensPath)) {
  console.error(`Color tokens file not found at: ${colorTokensPath}`);
  process.exit(1);
}

if (!fs.existsSync(designTokensPath)) {
  console.error(`Design tokens file not found at: ${designTokensPath}`);
  process.exit(1);
}

const colorTokens = JSON.parse(fs.readFileSync(colorTokensPath, 'utf8'));
const designTokens = JSON.parse(fs.readFileSync(designTokensPath, 'utf8'));

// Helper to convert token reference "{color.a.b.c}" to "var(--color-a-b-c)"
function resolveReference(refStr) {
  if (typeof refStr !== 'string') return refStr;
  const match = refStr.match(/^\{([^}]+)\}$/);
  if (match) {
    const parts = match[1].split('.');
    const varName = parts.join('-');
    return `var(--${varName})`;
  }
  return refStr;
}

// Initialize CSS string
let cssContent = `/* ==========================================================================
   DESIGN TOKENS - AUTO-GENERATED CSS VARIABLES
   ========================================================================== */

:root {
  /* ------------------------------------------------------------------------
     1. COLOR PRIMITIVES (Internal use only - the UI should only use color roles)
     ------------------------------------------------------------------------ */
`;

// 1. Render Key colors
cssContent += `\n  /* Key Colors */\n`;
if (colorTokens.color && colorTokens.color.key) {
  for (const [key, value] of Object.entries(colorTokens.color.key)) {
    cssContent += `  --color-key-${key}: ${value};\n`;
  }
}

// 2. Render Palette colors
cssContent += `\n  /* Palette Colors */\n`;
if (colorTokens.color && colorTokens.color.palette) {
  for (const [paletteName, tones] of Object.entries(colorTokens.color.palette)) {
    cssContent += `  /* ${paletteName.charAt(0).toUpperCase() + paletteName.slice(1)} Tones */\n`;
    // Sort tones numerically
    const sortedTones = Object.entries(tones).sort((a, b) => Number(a[0]) - Number(b[0]));
    for (const [tone, value] of sortedTones) {
      cssContent += `  --color-palette-${paletteName}-${tone}: ${value};\n`;
    }
  }
}

// 3. Generate Typography variables
cssContent += `\n  /* ------------------------------------------------------------------------
     2. TYPOGRAPHY TOKENS (Raw values from design system)
     ------------------------------------------------------------------------ */\n`;

const fontTokens = designTokens.font || {};

for (const [category, styles] of Object.entries(fontTokens)) {
  cssContent += `\n  /* ${category.charAt(0).toUpperCase() + category.slice(1)} Styles */\n`;
  for (const [styleName, styleData] of Object.entries(styles)) {
    const properties = styleData.value || {};
    const cssStyleName = styleName.replace(/\s+/g, '-'); // e.g. "display large" -> "display-large"
    
    const fontSize = properties.fontSize ? `${properties.fontSize}px` : '';
    // Use exact font family from the tokens, do not invent fallbacks
    const fontFamily = properties.fontFamily ? properties.fontFamily : '';
    const fontWeight = properties.fontWeight || 'normal';
    const fontStyle = properties.fontStyle || 'normal';
    const letterSpacing = properties.letterSpacing !== undefined ? `${properties.letterSpacing}px` : '0px';
    const lineHeight = properties.lineHeight ? `${properties.lineHeight}px` : 'normal';
    const textDecoration = properties.textDecoration || 'none';
    const textCase = properties.textCase || 'none';

    cssContent += `  /* ${styleName} */\n`;
    cssContent += `  --typography-${cssStyleName}-font-size: ${fontSize};\n`;
    cssContent += `  --typography-${cssStyleName}-font-family: ${fontFamily};\n`;
    cssContent += `  --typography-${cssStyleName}-font-weight: ${fontWeight};\n`;
    cssContent += `  --typography-${cssStyleName}-font-style: ${fontStyle};\n`;
    cssContent += `  --typography-${cssStyleName}-letter-spacing: ${letterSpacing};\n`;
    cssContent += `  --typography-${cssStyleName}-line-height: ${lineHeight};\n`;
    cssContent += `  --typography-${cssStyleName}-text-decoration: ${textDecoration};\n`;
    cssContent += `  --typography-${cssStyleName}-text-case: ${textCase};\n`;
    
    // Exact shorthand using ONLY raw token values
    cssContent += `  --typography-${cssStyleName}-font: ${fontStyle} normal ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily};\n`;
  }
}

// 4. Generate Light and Dark Roles
if (colorTokens.color && colorTokens.color.role) {
  const lightRoles = colorTokens.color.role.light || {};
  const darkRoles = colorTokens.color.role.dark || {};

  cssContent += `\n  /* ------------------------------------------------------------------------
     3. COLOR ROLES - LIGHT THEME (DEFAULT)
     ------------------------------------------------------------------------ */\n`;

  for (const [roleName, ref] of Object.entries(lightRoles)) {
    cssContent += `  --color-${roleName}: ${resolveReference(ref)};\n`;
  }

  cssContent += `\n  /* ------------------------------------------------------------------------
     4. RESPONSIVE TYPOGRAPHY MAPPING (Strict semantic variables for UI usage)
     ------------------------------------------------------------------------ */
  /* Desktop / Default Mappings */
  --font-display-large: var(--typography-display-large-font);
  --font-display-medium: var(--typography-display-medium-font);
  --font-display-small: var(--typography-display-small-font);

  --font-headline-large: var(--typography-headline-large-font);
  --font-headline-small: var(--typography-headline-small-font);

  --font-title-large: var(--typography-tile-large-font);
  --font-title-medium: var(--typography-title-medium-font);
  --font-title-small: var(--typography-title-small-font);

  --font-body-large: var(--typography-body-large-font);
  --font-body-medium: var(--typography-body-medium-font);
  --font-body-small: var(--typography-body-small-font);

  --font-label-large: var(--typography-label-large-font);
  --font-label-medium: var(--typography-label-medium-font);
  --font-label-small: var(--typography-label-small-font);
}\n`;

  // Dark theme overrides
  cssContent += `
/* ------------------------------------------------------------------------
   5. COLOR ROLES - DARK THEME OVERRIDES
   ------------------------------------------------------------------------ */

/* Auto dark-mode based on system preferences */
@media (prefers-color-scheme: dark) {
  :root {
`;

  for (const [roleName, ref] of Object.entries(darkRoles)) {
    cssContent += `    --color-${roleName}: ${resolveReference(ref)};\n`;
  }

  cssContent += `  }
}

/* Explicit class-based dark-mode theme selector */
[data-theme="dark"] {
`;

  for (const [roleName, ref] of Object.entries(darkRoles)) {
    cssContent += `  --color-${roleName}: ${resolveReference(ref)};\n`;
  }

  cssContent += `}

/* Explicit class-based light-mode theme selector */
[data-theme="light"] {
`;

  for (const [roleName, ref] of Object.entries(lightRoles)) {
    cssContent += `  --color-${roleName}: ${resolveReference(ref)};\n`;
  }

  cssContent += `}
`;
} else {
  cssContent += `}\n`;
}

// 5. Generate Responsive Typography Media Queries (Scaling down headings/displays on mobile)
cssContent += `
/* ------------------------------------------------------------------------
   6. RESPONSIVE TYPOGRAPHY OVERRIDES (Mobile scale downs)
   ------------------------------------------------------------------------ */
@media (max-width: 768px) {
  :root {
    /* Scale down display styles by one level */
    --font-display-large: var(--typography-display-medium-font);
    --font-display-medium: var(--typography-display-small-font);
    --font-display-small: var(--typography-headline-large-font);

    /* Scale down headline styles */
    --font-headline-large: var(--typography-headline-small-font);
    --font-headline-small: var(--typography-tile-large-font);

    /* Scale down title styles */
    --font-title-large: var(--typography-title-medium-font);
    --font-title-medium: var(--typography-title-small-font);
    --font-title-small: var(--typography-body-large-font);

    /* Body and labels remain stable for high readability on small screens */
  }
}
`;

// Write the CSS variables file
const outputPaths = [
  path.join(__dirname, 'variables.css'),
  path.join(__dirname, '..', 'variables.css')
];

for (const outputPath of outputPaths) {
  fs.writeFileSync(outputPath, cssContent);
  console.log(`CSS Variables file generated successfully at: ${outputPath}`);
}
