"""Fix indentation in main.py - from 14sp to 13sp for the auto-fix block"""
import re

with open(r"main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find and fix lines 85-99 (0-indexed: 84-98) - reduce 1 space from each
new_lines = []
in_block = False
for i, line in enumerate(lines):
    if "# 6. Auto-fix:" in line:
        in_block = True
    
    if in_block and line.strip():
        # Remove exactly 1 leading space
        if line.startswith(" " * 14):
            line = line[1:]  # Remove 1 space
    
    if in_block and "utenti orfani" in line:
        in_block = False
    
    new_lines.append(line)

with open(r"main.py", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Done! Verifying...")

import py_compile
try:
    py_compile.compile("main.py", doraise=True)
    print("SYNTAX OK!")
except py_compile.PyCompileError as e:
    print(f"SYNTAX ERROR: {e}")
