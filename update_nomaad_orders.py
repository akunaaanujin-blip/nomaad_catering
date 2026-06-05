#!/usr/bin/env python3
"""Nomaad camp захиалгуудын төлөвийг 'Баталгаажсан' болгон шинэчилнэ."""
import sys, warnings, pickle, os
warnings.filterwarnings('ignore')

SHEET_ID  = '1gUt92TXoxWS5popXmM7g_gvJhU3LT2twTs3wp-l1Xss'
CREDS_FILE = os.path.expanduser('~/.nomaad_sheets_token.pkl')
NEW_STATUS = 'Баталгаажсан'

try:
    import gspread
    from google.auth.transport.requests import Request

    # OAuth token ачаалах
    creds = None
    if os.path.exists(CREDS_FILE):
        with open(CREDS_FILE, 'rb') as f:
            creds = pickle.load(f)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            print("❌ OAuth credential олдсонгүй. update_sheet.py-г эхлээд ажиллуулна уу.")
            sys.exit(1)

    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)

    # Бүх tab-уудыг жагсаах
    print("📋 Sheets tab-ууд:")
    for w in sh.worksheets():
        print(f"   [{w.id}] {w.title}  ({w.row_count} мөр)")

    print()
    target_title = input("Захиалгын tab-н нэрийг бичнэ үү (жнь: Захиалга): ").strip()
    ws = sh.worksheet(target_title)
    print(f"✓ '{ws.title}' tab нээгдлээ")

    # Толгой мөр (column headers)
    headers = ws.row_values(1)
    print(f"   Баганууд: {headers}")

    # Арга хэмжээ болон төлөвийн баганыг олох
    def find_col(keywords):
        for kw in keywords:
            for j, h in enumerate(headers):
                if kw.lower() in h.lower():
                    return j + 1  # 1-based
        return None

    event_col  = find_col(['арга_хэмжээ', 'арга хэмжээ', 'arga', 'event', 'төрөл'])
    status_col = find_col(['төлөв', 'tuluw', 'статус', 'status', 'zahialgiin'])

    if not event_col:
        event_col_str = input(f"Арга хэмжээний баганын дугаар (A=1, B=2, ...): ").strip()
        event_col = int(event_col_str)
    if not status_col:
        status_col_str = input(f"Төлөвийн баганын дугаар (A=1, B=2, ...): шинэ бол 0 → ").strip()
        status_col = int(status_col_str) if status_col_str else 0

    print(f"\n   Арга хэмжээний багана: {event_col} ({headers[event_col-1] if event_col <= len(headers) else '?'})")
    if status_col:
        print(f"   Төлөвийн багана: {status_col} ({headers[status_col-1] if status_col <= len(headers) else '?'})")

    # Бүх өгөгдлийг унших
    all_rows = ws.get_all_values()
    updates  = []

    for row_idx, row in enumerate(all_rows[1:], start=2):  # 2-р мөрөөс
        event_val = row[event_col - 1] if event_col <= len(row) else ''
        if 'nomaad camp' in event_val.lower() or 'nomaad' in event_val.lower():
            if status_col:
                cur_status = row[status_col - 1] if status_col <= len(row) else ''
                if NEW_STATUS not in cur_status:
                    updates.append((row_idx, status_col, NEW_STATUS))
                    print(f"   Мөр {row_idx}: '{event_val}' → статус шинэчлэнэ (одоо: '{cur_status}')")
            else:
                # Шинэ багана нэмэх шаардлагатай
                updates.append((row_idx, len(headers) + 1, NEW_STATUS))
                print(f"   Мөр {row_idx}: '{event_val}' → шинэ төлөв нэмнэ")

    if not updates:
        print("\n✅ Шинэчлэх Nomaad camp захиалга олдсонгүй (эсвэл бүгд аль хэдийн баталгаажсан).")
        sys.exit(0)

    print(f"\n⚠️  {len(updates)} мөр шинэчлэгдэх гэж байна.")
    confirm = input("Үргэлжлүүлэх үү? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Цуцалсан.")
        sys.exit(0)

    # Хэрэв status багана шинэ бол header нэмэх
    if status_col == 0 or status_col > len(headers):
        col_letter = chr(ord('A') + (status_col or len(headers) + 1) - 1)
        ws.update_cell(1, status_col or len(headers) + 1, 'төлөв')
        print(f"✓ Толгой мөрт 'төлөв' багана нэмлээ ({col_letter})")

    # Batch update
    cell_list = []
    for (r, c, val) in updates:
        cell = ws.cell(r, c)
        cell.value = val
        cell_list.append(cell)

    ws.update_cells(cell_list)
    print(f"\n🎉 {len(updates)} захиалга амжилттай шинэчлэгдлээ!")

except ImportError as e:
    print(f"❌ Модуль олдсонгүй: {e}")
    print("   pip3 install gspread google-auth-oauthlib")
except Exception as e:
    print(f"❌ Алдаа: {e}")
    import traceback; traceback.print_exc()
