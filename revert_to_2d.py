import os

file_path = r"c:\Users\vinjo\remote-concierge\public\conserje.html"

# HTML for 2D Consumption View (modeled after view-stats)
# Includes a Header with Fullscreen button
new_html_content = """        <!-- HEADER -->
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-300">
              Consumos y Suministros</h2>
            <p class="text-sm text-gray-400">Análisis detallado de recursos</p>
          </div>
          <button onclick="toggleConsumptionFullscreen()" id="btnConsumptionFS" 
                  class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-lg flex items-center gap-2">
            <i class="fas fa-expand"></i> Pantalla Completa
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-200px)]" id="consumption-2d-grid">
           
           <!-- WATER CHART -->
           <div class="glass-panel p-6 rounded-xl flex flex-col relative group">
              <div class="flex justify-between items-start mb-4">
                  <h3 class="text-xl font-semibold text-blue-400 flex items-center gap-2">
                    <i class="fas fa-tint"></i> Consumo Hídrico
                  </h3>
                  <div class="text-right">
                    <div class="text-3xl font-bold text-white flex items-baseline gap-1">
                        <span id="val-water-total">--</span>
                        <span class="text-sm text-gray-400 font-normal">L</span>
                    </div>
                  </div>
              </div>
              
              <div class="flex-grow relative w-full h-full min-h-0">
                  <canvas id="chartConsumptionWater"></canvas>
              </div>
           </div>

           <!-- ENERGY CHART -->
           <div class="glass-panel p-6 rounded-xl flex flex-col relative group">
              <div class="flex justify-between items-start mb-4">
                  <h3 class="text-xl font-semibold text-yellow-400 flex items-center gap-2">
                    <i class="fas fa-bolt"></i> Distribución Eléctrica
                  </h3>
                   <div class="text-right">
                    <div class="text-3xl font-bold text-white flex items-baseline gap-1">
                        <span id="val-energy-total">--</span>
                        <span class="text-sm text-gray-400 font-normal">kW</span>
                    </div>
                  </div>
              </div>

              <div class="flex-grow relative w-full h-full min-h-0">
                  <canvas id="chartConsumptionEnergy"></canvas>
              </div>
           </div>
        </div>"""

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# 1. REPLACE HTML CONTENT
# Find the start of the view content (inside view-consumption)
# view-consumption starts at: <div id="view-consumption" ...>
# We need to replace everything inside it.

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'id="view-consumption"' in line:
        start_idx = i + 1 # Start content after the opening tag
        break

if start_idx != -1:
    # Find the closing tag of view-consumption
    # It ends before "<!-- VIEW: ADVANCED INFO -->" (approx line 1231 in previous reads)
    for i in range(start_idx, len(lines)):
        if "<!-- VIEW: ADVANCED INFO -->" in lines[i]:
            # The closing div is usually 2 lines before this comment
            # But let's look for the </div> that closes view-consumption
            # The grid closes, then the view closes.
            # We want to replace everything inside the view div.
            
            # Let's verify indentation or context. 
            # We are pretty sure the line immediately preceding "<!-- VIEW: ADVANCED INFO -->" is empty 
            # and the one before that is </div>
            end_idx = i - 1 
            # Double check if lines[end_idx] is </div>
            if "</div>" in lines[i-2]: 
                 # Wait, if i is the comment, i-1 is blank, i-2 is </div> (closing view)
                 # We want to replace content UP TO i-2.
                 end_idx = i - 2
            elif "</div>" in lines[i-1]:
                 end_idx = i - 1
            break
            
    if end_idx != -1:
        print(f"Replacing content from {start_idx} to {end_idx}")
        lines[start_idx:end_idx] = [new_html_content + "\n"]
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print("HTML Updated Successfully")
    else:
        print("Could not find end of view-consumption")
else:
    print("Could not find start of view-consumption")
