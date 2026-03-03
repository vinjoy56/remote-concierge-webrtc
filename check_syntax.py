file_path = r"c:\Users\vinjo\remote-concierge\public\conserje.html"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

in_tick = False
start_line = -1

for i, line in enumerate(lines):
    # simple state machine for backticks
    # ignoring escaped backticks
    
    idx = 0
    while idx < len(line):
        char = line[idx]
        if char == '`':
            # check verification for escape?
            if idx > 0 and line[idx-1] == '\\':
                pass
            else:
                in_tick = not in_tick
                if in_tick:
                    start_line = i + 1
        idx += 1

if in_tick:
    print(f"Unclosed backtick starting at line {start_line}")
else:
    print("All backticks closed.")

# Also check for brace balance
brace_level = 0
for i, line in enumerate(lines):
    for char in line:
        if char == '{': brace_level += 1
        if char == '}': brace_level -= 1
    
    if brace_level < 0:
        print(f"Negative brace level at line {i+1}")
        break

if brace_level > 0:
    print(f"Unclosed braces: level {brace_level} at end of file")
