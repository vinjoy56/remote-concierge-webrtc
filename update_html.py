import os

file_path = r"c:\Users\vinjo\remote-concierge\public\conserje.html"

new_content = """        <div class="space-y-8" id="consumption-grid">
          
          <!-- WATER 3D SECTION -->
          <div class="sensor-card glass-panel p-0 overflow-hidden relative" id="card-water" style="min-height: 400px;">
             <!-- 3D Canvas Container -->
             <div id="canvas-container-water" class="absolute inset-0 z-0"></div>
             
             <!-- Overlay Content -->
             <div class="relative z-10 p-8 pointer-events-none flex flex-col h-full bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent">
                <div class="flex items-center gap-4 mb-6">
                  <div class="p-3 bg-blue-500/20 rounded-xl backdrop-blur-md border border-blue-500/30">
                    <div class="text-3xl">🚰</div>
                  </div>
                  <div>
                    <h3 class="font-bold text-3xl text-white drop-shadow-md">Agua Potable</h3>
                    <p class="text-blue-200/80 text-sm">Visualización Volumétrica</p>
                  </div>
                </div>

                <div class="mt-auto space-y-6 max-w-xs">
                    <div class="backdrop-blur-md bg-slate-950/50 p-4 rounded-xl border border-white/10 pointer-events-auto">
                        <span class="text-gray-400 text-xs uppercase tracking-wider block mb-1">Flujo Actual</span>
                        <div class="flex items-baseline gap-2">
                           <span id="val-flow-rate" class="text-4xl font-bold text-cyan-400">12.5</span>
                           <span class="text-sm text-gray-400">L/min</span>
                        </div>
                    </div>
                    
                    <div class="backdrop-blur-md bg-slate-950/50 p-4 rounded-xl border border-white/10 pointer-events-auto">
                        <span class="text-gray-400 text-xs uppercase tracking-wider block mb-1">Consumo Diario</span>
                        <div class="flex items-baseline gap-2">
                           <span id="val-water-consumed" class="text-4xl font-bold text-white">4.2k</span>
                           <span class="text-sm text-gray-400">L</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>

          <!-- ENERGY 3D SECTION -->
          <div class="sensor-card glass-panel p-0 overflow-hidden relative" id="card-electric" style="min-height: 400px;">
             <!-- 3D Canvas Container -->
             <div id="canvas-container-energy" class="absolute inset-0 z-0"></div>

             <!-- Overlay Content -->
             <div class="relative z-10 p-8 pointer-events-none flex flex-col h-full items-end text-right bg-gradient-to-l from-slate-900/80 via-slate-900/40 to-transparent">
                <div class="flex flex-row-reverse items-center gap-4 mb-6">
                  <div class="p-3 bg-orange-500/20 rounded-xl backdrop-blur-md border border-orange-500/30">
                    <div class="text-3xl">⚡</div>
                  </div>
                  <div>
                    <h3 class="font-bold text-3xl text-white drop-shadow-md">Matriz Energética</h3>
                    <p class="text-orange-200/80 text-sm">Núcleo de Potencia Activa</p>
                  </div>
                </div>

                <div class="mt-auto grid grid-cols-1 gap-4 w-full max-w-sm pointer-events-auto">
                    <div class="backdrop-blur-md bg-slate-950/60 p-3 rounded-lg border-r-4 border-orange-500 flex justify-between items-center">
                        <div class="text-xs text-orange-400 font-bold uppercase">Comunidad</div>
                        <div class="font-mono text-xl text-white"><span id="val-pwr-comunidad">38.4</span> kW</div>
                    </div>
                    <div class="backdrop-blur-md bg-slate-950/60 p-3 rounded-lg border-r-4 border-red-500 flex justify-between items-center">
                        <div class="text-xs text-red-400 font-bold uppercase">Torre A</div>
                        <div class="font-mono text-xl text-white"><span id="val-pwr-torre-a">125</span> kW</div>
                    </div>
                    <div class="backdrop-blur-md bg-slate-950/60 p-3 rounded-lg border-r-4 border-emerald-500 flex justify-between items-center">
                        <div class="text-xs text-emerald-400 font-bold uppercase">Torre B</div>
                        <div class="font-mono text-xl text-white"><span id="val-pwr-torre-b">118</span> kW</div>
                    </div>
                </div>
             </div>
          </div>
        </div>"""

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find start and end indices
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'id="consumption-grid"' in line:
        start_idx = i
        break

if start_idx != -1:
    # Look for closing div of the grid
    # We know it ends before the next view
    for i in range(start_idx + 1, len(lines)):
        if "<!-- VIEW: ADVANCED INFO -->" in line: # Search safety stop
             break
        # Primitive div counting could be buggy, but let's assume structure
        # Actually in Step 902 we saw it ends at 1229 which is before "</div>" of parent?
        # Let's use specific markers
        if 'id="view-advanced"' in lines[i]:
            end_idx = i - 2 # Approx
            break
        
    # Better approach: We know consumption grid is lines 1087 to 1228 (from Step 902)
    # 1087: <div ... id="consumption-grid">
    # 1228: </div>
    # Let's verify content.
    
    # We will replace from start_idx to the matching closing div.
    # Count braces?
    # Or just hardcode based on known context?
    # Let's scan for the next id="view-X" div and back up?
    for i in range(start_idx, len(lines)):
        if "<!-- VIEW: ADVANCED INFO -->" in lines[i]:
             end_idx = i - 2 # The line before '</div>' which closes consumption view?
             # No, consumption view closes at 1229.
             # Consumption GRID closes at 1228.
             # Advanced view comment is at 1231.
             # So we are looking for the </div> before the </div> that closes view-consumption.
             pass

    # Simplified: Just replace the lines I know are there using string match on block start/end
    # But that failed before.
    
    # Let's explicitly replace lines 1087 to 1228 (0-indexed: 1086 to 1227)
    # Check if lines[1086] is the div we want.
    if 'id="consumption-grid"' in lines[1086]:
        print(f"Found grid at 1086: {lines[1086]}")
        # Find ending
        # The closing div was at 1228 (1-indexed) -> 1227 (0-indexed)
        # Let's check lines[1227]
        print(f"Checking line 1227: {lines[1227]}")
        
        # Replace
        lines[1086:1228] = [new_content + "\n"]
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print("Success")
    else:
        # Fallback search
        print("Line 1086 match failed, searching...")
        # ... logic ...
