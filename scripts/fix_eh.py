c = open("src/registration/search/useMemberSearch.ts").read()
lines = c.split(chr(10))
qt = chr(39)
nt = "(e: { target: { value: string } }) => {"
for i in range(len(lines)):
    if lines[i].strip() == "(e) => {" and i > 150:
        lines[i] = lines[i].replace("(e) => {", nt)
if lines[0].find("import React") == -1:
    lines.insert(0, "import React from " + qt + "react" + qt + ";")
open("src/registration/search/useMemberSearch.ts", "w").write(chr(10).join(lines))
print("done")