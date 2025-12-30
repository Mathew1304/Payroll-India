import os
import re

MIGRATIONS_DIR = r"c:\Users\Mathew Fedrick 13\Downloads\PayrollQatar\supabase\migrations"
OUTPUT_DIR = r"c:\Users\Mathew Fedrick 13\Downloads\PayrollQatar"
SCHEMA_FILE = os.path.join(OUTPUT_DIR, "full_schema.sql")
RLS_FILE = os.path.join(OUTPUT_DIR, "full_rls.sql")

def get_files():
    files = [f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql")]
    # Sort: Timestamped files first, then others alphabetically
    timestamped = []
    others = []
    for f in files:
        if re.match(r"^\d+_", f):
            timestamped.append(f)
        else:
            others.append(f)
    timestamped.sort()
    others.sort()
    return timestamped + others

def strip_comments(stmt):
    # Remove single line comments --...
    lines = stmt.split('\n')
    cleaned_lines = []
    for line in lines:
        # Simple comment stripping: remove from -- to end of line
        # This is risky if -- is inside a string, but for identifying the command type it's usually fine
        # if the command starts at the beginning of the line.
        # A safer way allows checking the 'meaningful' start of the query
        clean = re.sub(r'--.*$', '', line)
        if clean.strip():
            cleaned_lines.append(clean)
    return "\n".join(cleaned_lines).strip()

def is_rls_statement(stmt):
    # Normalize by removing comments effectively for the check
    stmt_clean = strip_comments(stmt).upper()
    # Normalize whitespace to single spaces to handle newlines
    stmt_clean = " ".join(stmt_clean.split())
    
    if "CREATE POLICY" in stmt_clean: # A bit loose, but usually fine for top level
         # Make sure it's not inside a function definition (CREATE FUNCTION ... $$ ... CREATE POLICY ... $$)
         # If it is inside $$, it shouldn't be split here anyway if our splitter works.
         # But our splitter simply splits by ; outside quotes.
         # If the PREVIOUS logic worked, then CREATE FUNCTION is one hunk.
         # So if "CREATE FUNCTION" is in the hunk, it's Schema.
         if "CREATE FUNCTION" in stmt_clean or "CREATE OR REPLACE FUNCTION" in stmt_clean:
             return False
         return True
    
    if stmt_clean.startswith("DROP POLICY"):
        return True
    if stmt_clean.startswith("GRANT"):
        return True
    if "ENABLE ROW LEVEL SECURITY" in stmt_clean and "ALTER TABLE" in stmt_clean:
        return True
    return False

def split_sql_statements(sql_content):
    # Simple state machine to split by semicolon, respecting dollar quotes $$, simple quotes ', and comments
    statements = []
    current_stmt = []
    i = 0
    length = len(sql_content)
    dollar_quote_tag = None
    in_single_quote = False
    in_line_comment = False
    in_block_comment = False
    
    while i < length:
        char = sql_content[i]
        
        if in_line_comment:
            if char == '\n':
                in_line_comment = False
            current_stmt.append(char)
            i += 1
            continue
            
        if in_block_comment:
            if char == '*' and i + 1 < length and sql_content[i+1] == '/':
                in_block_comment = False
                current_stmt.append("*/")
                i += 2
                continue
            current_stmt.append(char)
            i += 1
            continue
            
        # Check for start of comments
        if not in_single_quote and not dollar_quote_tag:
            if char == '-' and i + 1 < length and sql_content[i+1] == '-':
                in_line_comment = True
                current_stmt.append("--")
                i += 2
                continue
            if char == '/' and i + 1 < length and sql_content[i+1] == '*':
                in_block_comment = True
                current_stmt.append("/*")
                i += 2
                continue

        # Check for dollar quote start/end
        if not in_single_quote:
            if dollar_quote_tag:
                # We are in a dollar quote, look for the closing tag
                if sql_content[i:].startswith(dollar_quote_tag):
                    # Check if verify tag is not part of a longer identifier?? usually not needed
                    tag_len = len(dollar_quote_tag)
                    current_stmt.append(dollar_quote_tag)
                    i += tag_len
                    dollar_quote_tag = None
                else:
                    current_stmt.append(char)
                    i += 1
            else:
                # Check if this is a start of a dollar quote
                # Dollar quote looks like $tag$ or $$
                match = re.match(r"^\$([A-Za-z0-9_]*)\$", sql_content[i:])
                if match:
                    tag = match.group(0)
                    dollar_quote_tag = tag
                    i += len(tag)
                    current_stmt.append(tag)
                else:
                    # Normal processing
                    if char == "'":
                        in_single_quote = True
                    
                    if char == ";" and not in_single_quote:
                        statements.append("".join(current_stmt).strip())
                        current_stmt = []
                    else:
                        current_stmt.append(char)
                    i += 1
        else:
            # Inside single quote
            if char == "'":
                # Check for escaped quote ''
                if i + 1 < length and sql_content[i+1] == "'":
                    current_stmt.append("''")
                    i += 2
                else:
                    in_single_quote = False
                    current_stmt.append("'")
                    i += 1
            else:
                current_stmt.append(char)
                i += 1
        
    if current_stmt:
        s = "".join(current_stmt).strip()
        if s:
            statements.append(s)
            
    return statements

def main():
    files = get_files()
    schema_content = []
    rls_content = []
    
    schema_content.append("-- FULL SCHEMA EXPORT")
    rls_content.append("-- FULL RLS POLICIES EXPORT")
    
    for fname in files:
        fpath = os.path.join(MIGRATIONS_DIR, fname)
        print(f"Processing {fname}...")
        
        schema_content.append(f"\n-- ==========================================\n-- FROM FILE: {fname}\n-- ==========================================\n")
        rls_content.append(f"\n-- ==========================================\n-- FROM FILE: {fname}\n-- ==========================================\n")
        
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Remove comments for simpler parsing?
        # Actually comments are useful. But they mess up the split logic if they contain ;
        # The simple parser above doesn't handle -- comments ending at newline.
        # Let's clean -- comments first? No, comments might be inside code.
        # Let's improve the parser to handle -- comments.
        
        # Improved parser loop below implies we handle comments.
        # But for this one-shot, manual chunking of files is safer if the parser is complex.
        # Let's assume the files are well-formatted.
        # Many files have lines starting with --
        
        statements = split_sql_statements(content)
        
        for stmt in statements:
            if not stmt:
                continue
            
            # Check if it's RLS
            if is_rls_statement(stmt):
                rls_content.append(stmt + ";")
            else:
                if "CREATE POLICY" in stmt.upper():
                    print(f"DEBUG: Found POLICY in SCHEMA block in file {fname}:")
                    print(stmt[:200])
                    print("---")
                schema_content.append(stmt + ";")

    with open(SCHEMA_FILE, "w", encoding="utf-8") as f:
        f.write("\n\n".join(schema_content))
        
    with open(RLS_FILE, "w", encoding="utf-8") as f:
        f.write("\n\n".join(rls_content))

    print(f"Done. Files created at:\n{SCHEMA_FILE}\n{RLS_FILE}")

if __name__ == "__main__":
    main()
