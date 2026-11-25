const fs = require('fs');

const { pathMain, pathUnder } = JSON.parse(fs.readFileSync('torn_paths.json', 'utf8'));

const svgBlock = `      <!-- Realistic Hand-Torn / Ripped Paper Border Divider -->
      <div class="absolute bottom-0 inset-x-0 z-10 pointer-events-none leading-none -mb-[1px]">
        <svg class="w-full h-16 sm:h-24 md:h-32 block" viewBox="0 0 1440 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="torn-paper-shadow" x="-5%" y="-35%" width="110%" height="170%">
              <feDropShadow dx="0" dy="-4" stdDeviation="5" flood-color="#05181d" flood-opacity="0.35" />
            </filter>
          </defs>

          <!-- Layer 1: Under-ply torn paper fiber deckle edge (Semi-translucent white) -->
          <path
            fill="#ffffff"
            fill-opacity="0.40"
            d="${pathUnder}"
          />

          <!-- Layer 2: Main foreground ripped paper sheet with realistic torn deckle edge & shadow -->
          <path
            fill="#ffffff"
            filter="url(#torn-paper-shadow)"
            d="${pathMain}"
          />
        </svg>
      </div>`;

function replaceDividerInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the divider block
  const startMarker = '<!-- Smooth Organic Paper-Cutting Layered Divider -->';
  const endMarker = '</section>';
  
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    console.log(`Marker not found in ${filePath}`);
    return false;
  }
  
  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex === -1) {
    console.log(`End marker not found in ${filePath}`);
    return false;
  }
  
  const newContent = content.substring(0, startIndex) + svgBlock + '\n    ' + content.substring(endIndex);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Successfully updated torn paper divider in ${filePath}`);
  return true;
}

replaceDividerInFile('public/index.html');
replaceDividerInFile('riverdale_kayaking_official_river_kayaking_website (1).html');
