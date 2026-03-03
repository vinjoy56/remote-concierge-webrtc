import os

file_path = r"c:\Users\vinjo\remote-concierge\public\conserje.html"

new_content = """        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)] min-h-[400px]" id="consumption-grid">
          
          <!-- WATER 3D SECTION -->
          <div class="sensor-card glass-panel p-0 overflow-hidden relative h-full flex flex-col" id="card-water">
             <!-- 3D Canvas Container -->
             <div id="canvas-container-water" class="absolute inset-0 z-0"></div>
             
             <!-- Overlay Content -->
             <div class="relative z-10 p-6 pointer-events-none flex flex-col h-full bg-gradient-to-b from-slate-900/50 to-transparent">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                      <div class="p-2 bg-blue-500/20 rounded-lg backdrop-blur-md border border-blue-500/30">
                        <div class="text-2xl">🚰</div>
                      </div>
                      <div>
                        <h3 class="font-bold text-xl text-white drop-shadow-md">Agua Potable</h3>
                        <p class="text-blue-200/80 text-xs">Distribución Diaria</p>
                      </div>
                  </div>
                </div>

                <!-- Legend / Stats at bottom -->
                <div class="mt-auto grid grid-cols-2 gap-4">
                    <div class="backdrop-blur-md bg-slate-950/40 p-3 rounded-xl border border-white/10 pointer-events-auto hover:bg-slate-950/60 transition">
                        <span class="text-gray-400 text-[10px] uppercase tracking-wider block mb-1">Consumido</span>
                        <div class="flex items-baseline gap-1">
                           <span id="val-water-consumed" class="text-2xl font-bold text-cyan-400">--</span>
                           <span class="text-xs text-gray-400">L</span>
                        </div>
                    </div>
                     <div class="backdrop-blur-md bg-slate-950/40 p-3 rounded-xl border border-white/10 pointer-events-auto hover:bg-slate-950/60 transition">
                        <span class="text-gray-400 text-[10px] uppercase tracking-wider block mb-1">Flujo</span>
                        <div class="flex items-baseline gap-1">
                           <span id="val-flow-rate" class="text-2xl font-bold text-white">--</span>
                           <span class="text-xs text-gray-400">L/min</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>

          <!-- ENERGY 3D SECTION -->
          <div class="sensor-card glass-panel p-0 overflow-hidden relative h-full flex flex-col" id="card-electric">
             <!-- 3D Canvas Container -->
             <div id="canvas-container-energy" class="absolute inset-0 z-0"></div>

             <!-- Overlay Content -->
             <div class="relative z-10 p-6 pointer-events-none flex flex-col h-full bg-gradient-to-b from-slate-900/50 to-transparent">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                      <div class="p-2 bg-orange-500/20 rounded-lg backdrop-blur-md border border-orange-500/30">
                        <div class="text-2xl">⚡</div>
                      </div>
                      <div>
                        <h3 class="font-bold text-xl text-white drop-shadow-md">Red Eléctrica</h3>
                        <p class="text-orange-200/80 text-xs">Distribución por Sector</p>
                      </div>
                  </div>
                </div>

                <!-- Legend at bottom -->
                <div class="mt-auto flex gap-2 pointer-events-auto overflow-x-auto pb-2">
                    <!-- Community -->
                    <div class="flex-1 min-w-[100px] backdrop-blur-md bg-slate-950/40 p-2 rounded-lg border-l-2 border-orange-500 flex flex-col justify-between hover:bg-slate-950/60 transition">
                        <div class="text-[10px] text-orange-400 font-bold uppercase truncate">Comunidad</div>
                        <div class="font-mono text-lg text-white"><span id="val-pwr-comunidad">--</span> <span class="text-xs text-gray-500">kW</span></div>
                    </div>
                    <!-- Tower A -->
                    <div class="flex-1 min-w-[100px] backdrop-blur-md bg-slate-950/40 p-2 rounded-lg border-l-2 border-red-500 flex flex-col justify-between hover:bg-slate-950/60 transition">
                        <div class="text-[10px] text-red-400 font-bold uppercase truncate">Torre A</div>
                        <div class="font-mono text-lg text-white"><span id="val-pwr-torre-a">--</span> <span class="text-xs text-gray-500">kW</span></div>
                    </div>
                    <!-- Tower B -->
                     <div class="flex-1 min-w-[100px] backdrop-blur-md bg-slate-950/40 p-2 rounded-lg border-l-2 border-emerald-500 flex flex-col justify-between hover:bg-slate-950/60 transition">
                        <div class="text-[10px] text-emerald-400 font-bold uppercase truncate">Torre B</div>
                        <div class="font-mono text-lg text-white"><span id="val-pwr-torre-b">--</span> <span class="text-xs text-gray-500">kW</span></div>
                    </div>
                </div>
             </div>
          </div>
        </div>"""

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Locate the consumption grid block
# Use id="consumption-grid"
start_idx = -1
for i, line in enumerate(lines):
    if 'id="consumption-grid"' in line:
        start_idx = i
        break

if start_idx != -1:
    # We replaced it previously with python so we know the structure
    # It ends with </div> and then usually a blank line or next view.
    # The block we inserted spans until the line before the closing of the view-consumption
    # view-consumption closes at the end.
    
    # Let's count divs or look for the closing div of "consumption-grid"
    # The previous script might not have been perfect with indentation but it worked.
    
    # heuristic: verify if next block is "<!-- VIEW: ADVANCED INFO -->"
    # or just find the matching </div> by indentation if possible, or just known context.
    
    end_idx = -1
    for i in range(start_idx + 1, len(lines)):
        # We look for the </div> that closes the grid.
        # Since we just wrote it, we expect it to be indented.
        if "<!-- VIEW: ADVANCED INFO -->" in lines[i]:
            # The lines before this should include the closing div of the grid 
            # AND the closing div of the view-consumption container!
            # view-consumption container opened at 1081.
            # grid opened at 1087 (now).
            # So we are looking for the closing div of the grid.
            
            # Let's just find the range effectively.
            # The grid ends 2 lines before "VIEW: ADVANCED INFO"?
            # Let's peek
            end_idx = i - 2 
            break
            
    # Safety check
    if end_idx > start_idx:
        print(f"Replacing lines {start_idx} to {end_idx}")
        # Note: we need to replace the closing div of the grid too.
        # Ensure new_content includes the closing div. Yes it does.
        
        # Actually in previous script, we wrote lines[1086:1228]. 
        # The new content will replace from start_idx to the line before "</div>" of parent view-consumption?
        # Let's assume the previous `update_html.py` worked and the structure is now:
        # <div id="consumption-grid"> ... </div>
        # </div> (closes view-consumption)
        
        # We want to replace the whole <div id="consumption-grid">...</div> block.
        
        # Start is lines[start_idx]
        # End is... well, let's look for the line </div> that aligns or just scan until `</div>` followed by `</div>`?
        
        # Let's try to locate the specific ending based on content we injected last time.
        # Last time we injected `</div>` to close the grid.
        
        # Let's perform a smart replace.
        lines[start_idx:end_idx] = [new_content + "\n"]
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print("Success")
    else:
        print("Could not find end index")
else:
    print("Could not find start index")
