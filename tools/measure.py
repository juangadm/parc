# Find coloured sticks in a Le Parc row image and measure them per cell.
import sys, struct, math
b = open(sys.argv[1], 'rb').read()
off = struct.unpack_from('<I', b, 10)[0]; w, h = struct.unpack_from('<ii', b, 18)
bp = struct.unpack_from('<H', b, 28)[0] // 8; row = (w * bp + 3) // 4 * 4
flip = h > 0; h = abs(h)
def px(x, y):
    yy = (h - 1 - y) if flip else y
    i = off + yy * row + x * bp
    return b[i + 2], b[i + 1], b[i]
def kind(r, g, bl):
    if r > 100 and r > g + 50 and r > bl + 40: return 'red'
    if bl > 90 and bl > r + 40 and bl > g + 20: return 'blue'
    # half-way between ink (~20) and board (~225): counts edge pixels that are mostly ink
    if max(r, g, bl) < 122: return 'black'
    return None
K = [[kind(*px(x, y)) for x in range(w)] for y in range(h)]
# cell edges: the grey dividers are columns darker than the board in the middle band
band = range(h // 3, 2 * h // 3)
lum = [sum(sum(px(x, y)) for y in band) / len(band) / 3 for x in range(w)]
seen = [[False] * w for _ in range(h)]; comps = []
for y in range(h):
    for x in range(w):
        if K[y][x] and not seen[y][x]:
            c = K[y][x]; st = [(x, y)]; seen[y][x] = True; pts = []
            while st:
                a, bb = st.pop(); pts.append((a, bb))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = a + dx, bb + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and K[ny][nx] == c:
                            seen[ny][nx] = True; st.append((nx, ny))
            if len(pts) >= 12: comps.append((c, pts))
for c, pts in sorted(comps, key=lambda c: sum(p[0] for p in c[1]) / len(c[1])):
    n = len(pts); mx = sum(p[0] for p in pts) / n; my = sum(p[1] for p in pts) / n
    sxx = sum((p[0] - mx) ** 2 for p in pts) / n; syy = sum((p[1] - my) ** 2 for p in pts) / n; sxy = sum((p[0] - mx) * (p[1] - my) for p in pts) / n
    ang = 0.5 * math.degrees(math.atan2(2 * sxy, sxx - syy))  # 0 = horizontal, + = clockwise on screen
    ux, uy = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    proj = [(p[0] - mx) * ux + (p[1] - my) * uy for p in pts]
    print(f"{c:4} n={n:3} centre=({mx:6.1f},{my:5.1f}) angle={ang:6.1f} length={max(proj)-min(proj):5.1f}")
print("size", w, h)
rows_band = range(w // 3, 2 * w // 3)
print("dark rows:", [y for y in range(1, h - 1) if sum(sum(px(x, y)) for x in rows_band) / len(rows_band) / 3 < 175])
print("dark columns:", [x for x in range(1, w - 1) if lum[x] < min(lum[x-1], lum[x+1]) and lum[x] < 175])
