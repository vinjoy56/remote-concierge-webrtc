import re

file_path = r"c:\Users\vinjo\remote-concierge\public\conserje.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Define markers
start_marker = "<!-- NEW VIEW: CONSUMPTION -->"
end_marker = "<!-- VIEW: ADVANCED INFO -->"

# Find the Consumption block
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Error: Could not find Consumption block markers")
    exit(1)

# Extract block (including newlines before/after if needed)
consumption_block = content[start_idx:end_idx]

# Remove block from original location
# Check if we should clean up extra newlines
new_content_temp = content[:start_idx] + content[end_idx:]

# Modify subtitle in the block
# "Análisis detallado de recursos" -> "Consumos Actualizados"
if "Análisis detallado de recursos" not in consumption_block:
    print("Warning: Subtitle not found in consumption block")
else:
    consumption_block = consumption_block.replace("Análisis detallado de recursos", "Consumos Actualizados")

# Find insertion point: After Solar view, Before Map view
# Search for <!-- VIEW: PREDICTIVE MAP -->
map_marker = "<!-- VIEW: PREDICTIVE MAP -->"
insert_idx = new_content_temp.find(map_marker)

if insert_idx == -1:
    print("Error: Could not find Map view marker")
    exit(1)

# Insert block before Map view
final_content = new_content_temp[:insert_idx] + consumption_block + "\n" + new_content_temp[insert_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(final_content)

print("Successfully moved Consumption view and updated subtitle.")
