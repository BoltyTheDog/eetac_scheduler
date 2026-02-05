import csv
import json
import re
import os
from datetime import datetime

def get_weekday(date_str):
    # Date format is DD/MM/YYYY
    dt = datetime.strptime(date_str, "%d/%m/%Y")
    return dt.weekday() + 1

def parse_subject(subject_str):
    match = re.match(r"([^(]+)\(([^)]+)\)\s*-\s*(.*)", subject_str)
    if match:
        code = match.group(1).strip()
        type_code = match.group(2).strip()
        group = match.group(3).strip()
        
        final_type = "P"
        if type_code == "G":
            final_type = "T"
        elif type_code == "L":
            final_type = "L"
            
        return code, final_type, group
    return None, None, None

def get_week_number(date_str):
    start_date = datetime.strptime("16/02/2026", "%d/%m/%Y")
    current_date = datetime.strptime(date_str, "%d/%m/%Y")
    delta = current_date - start_date
    return (delta.days // 7) + 1

def convert_sources_to_json(sources_dir, output_paths):
    unique_sessions = {}
    
    if not os.path.exists(sources_dir):
        print(f"Error: Sources directory '{sources_dir}' not found.")
        return

    csv_files = [f for f in os.listdir(sources_dir) if f.endswith('.csv')]
    if not csv_files:
        print(f"No CSV files found in {sources_dir}")
        return

    for csv_file in csv_files:
        csv_path = os.path.join(sources_dir, csv_file)
        print(f"Processing {csv_file}...")
        
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
                if not row.get('End Time'): continue
                end_dt = datetime.strptime(row['End Time'], "%H:%M:%S")
                duration = int((end_dt - start_dt).total_seconds() / 3600)

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

    # Aggregation and Inheritance Logic
    # 1. Group sessions by subject and then by name
    subject_map = {}
    for s in unique_sessions.values():
        code = s["codi_assig"]
        grup = s["grup"]
        if code not in subject_map: subject_map[code] = {}
        if grup not in subject_map[code]: subject_map[code][grup] = []
        subject_map[code][grup].append(s)

    final_results = []
    for code, groups in subject_map.items():
        all_group_names = sorted(groups.keys(), key=len)
        parents = set()
        
        # Identify parents (groups that are prefixes of other groups)
        for i, g1 in enumerate(all_group_names):
            for g2 in all_group_names[i+1:]:
                if g2.startswith(g1):
                    parents.add(g1)
                    # Propagate sessions from parent g1 to child g2
                    # We need to make copies or deep clones if they have different weeks, 
                    # but here we can just add them to the child's session list
                    for parent_session in groups[g1]:
                        # Create a copy for the child
                        child_session = parent_session.copy()
                        child_session["grup"] = g2
                        groups[g2].append(child_session)
                    break # Optimization: g1 is already identified as a parent

        # Add only non-parent groups (those that don't have sub-groups)
        for grup, sessions in groups.items():
            if grup not in parents:
                final_results.extend(sessions)
            else:
                print(f"Aggregating parent group {grup} for subject {code} into its sub-groups")

    # Final cleanup: sort weeks for all sessions
    for session in final_results:
        session["setmanes"].sort()

    output = { "count": len(final_results), "results": final_results }

    for path in output_paths:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2)
        print(f"Successfully saved {len(final_results)} sessions to {path}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sources = os.path.join(current_dir, 'sources')
    
    outputs = [
        os.path.join(current_dir, '..', 'src', 'data.json')
    ]
    
    convert_sources_to_json(sources, outputs)
