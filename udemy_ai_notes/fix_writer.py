import re
f = 'src/notes_ai/export/markdown_writer.py'
text = open(f, encoding='utf-8').read()
text = re.sub(r'if notes\.([a-z_]+):', r"if getattr(notes, '\1', None):", text)
open(f, 'w', encoding='utf-8').write(text)
