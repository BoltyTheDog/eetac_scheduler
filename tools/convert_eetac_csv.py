import csv
import json
import re
from datetime import datetime

def get_weekday(date_str):
    # Date format is DD/MM/YYYY
    dt = datetime.strptime(date_str, "%d/%m/%Y")
    # weekday() returns 0 for Monday, ..., 6 for Sunday
    # API expects 1 for Monday, ..., 5 for Friday
    return dt.weekday() + 1

def parse_subject(subject_str):
    # Format: "MO(P) - 4ES1" or "AM(G) - 2A3"
    match = re.match(r"([^(]+)\(([^)]+)\)\s*-\s*(.*)", subject_str)
    if match:
        code = match.group(1).strip()
        type_code = match.group(2).strip()
        group = match.group(3).strip()
        
        # Map type
        final_type = "P"
        if type_code == "G":
            final_type = "T"
        elif type_code == "L":
            final_type = "L"
            
        return code, final_type, group
    return None, None, None

def get_week_number(date_str):
    # Semester seems to start on 16/02/2026
    start_date = datetime.strptime("16/02/2026", "%d/%m/%Y")
    current_date = datetime.strptime(date_str, "%d/%m/%Y")
    delta = current_date - start_date
    return (delta.days // 7) + 1

def convert_csv_to_json(csv_path, json_path):
    unique_sessions = {}
    
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f, skipinitialspace=True)
        for row in reader:
            row = {k.strip() if k else k: v.strip() if v else v for k, v in row.items()}
            
            subject_raw = row.get('Subject')
            if subject_raw == "NO LECTIU" or not subject_raw:
                continue

            code, class_type, group = parse_subject(subject_raw)
            if not code:
                continue

            weekday = get_weekday(row['Start Date'])
            if weekday > 5:
                continue
            
            week_num = get_week_number(row['Start Date'])
            start_time = row['Start Time']
            start_parts = start_time.split(':')
            start_hour_str = f"{start_parts[0]}:{start_parts[1]}"

            start_dt = datetime.strptime(start_time, "%H:%M:%S")
            end_dt = datetime.strptime(row['End Time'], "%H:%M:%S")
            duration = int((end_dt - start_dt).total_seconds() / 3600)

            # Key for deduplication
            session_key = (code, group, class_type, weekday, start_hour_str, duration)

            if session_key not in unique_sessions:
                unique_sessions[session_key] = {
                    "codi_assig": code,
                    "grup": group,
                    "dia_setmana": weekday,
                    "inici": start_hour_str,
                    "durada": duration,
                    "tipus": class_type,
                    "setmanes": [week_num]
                }
            else:
                if week_num not in unique_sessions[session_key]["setmanes"]:
                    unique_sessions[session_key]["setmanes"].append(week_num)

    # Sort weeks
    for session in unique_sessions.values():
        session["setmanes"].sort()

    results = list(unique_sessions.values())
    output = { "count": len(results), "results": results }

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)

    print(f"Successfully converted {len(results)} sessions to {json_path}")

if __name__ == "__main__":
    # Update both desktop and web app data
    convert_csv_to_json('EspaiC4-20252.csv', 'schedule_data.txt')
    convert_csv_to_json('EspaiC4-20252.csv', '../src/data.json')
