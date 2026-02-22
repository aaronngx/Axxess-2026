import os
import json

def parse_fall_data(file_path):
    data = []
    with open(file_path, 'r') as f:
        lines = f.readlines()
        
    start_line = 0
    for i, line in enumerate(lines):
        if line.startswith('Counter'):
            start_line = i + 1
            break
            
    for line in lines[start_line:]:
        if not line.strip():
            continue
        parts = line.split('\t')
        if len(parts) < 22:
            continue
            
        try:
            row = {
                "counter": int(parts[0]),
                "vel_inc_x": float(parts[2]),
                "vel_inc_y": float(parts[3]),
                "vel_inc_z": float(parts[4]),
                "acc_x": float(parts[9]),
                "acc_y": float(parts[10]),
                "acc_z": float(parts[11]),
                "gyr_x": float(parts[12]),
                "gyr_y": float(parts[13]),
                "gyr_z": float(parts[14]),
                "roll": float(parts[19]),
                "pitch": float(parts[20]),
                "yaw": float(parts[21])
            }
            data.append(row)
        except ValueError:
            continue
            
    return data

sensors = {
    "340506": "Head",
    "340527": "Chest",
    "340535": "Waist",
    "340537": "Right Wrist",
    "340539": "Right Thigh",
    "340540": "Right Ankle"
}

def process_subjects(subject_ids):
    base_data_path = "/Users/jacquelinefrancis/Desktop/AHackathon/Fall_Data"
    all_subject_data = {}
    
    for subject_id in subject_ids:
        export_path = os.path.join(base_data_path, str(subject_id), "Testler Export")
        if not os.path.exists(export_path):
            continue
            
        print(f"--- Processing Subject {subject_id} ---")
        activities = {}
        
        # Get all activity folders
        for folder_name in sorted(os.listdir(export_path)):
            folder_path = os.path.join(export_path, folder_name)
            if not os.path.isdir(folder_path):
                continue
                
            test_path = os.path.join(folder_path, "Test_1")
            
            if os.path.exists(test_path):
                print(f"  Processing Activity: {folder_name}...")
                activity_data = {}
                for sid, name in sensors.items():
                    file_path = os.path.join(test_path, f"{sid}.txt")
                    if os.path.exists(file_path):
                        activity_data[name] = parse_fall_data(file_path)
                
                activities[folder_name] = activity_data
        
        all_subject_data[subject_id] = activities
            
    return all_subject_data

# Process subjects 101, 102, and 103
subjects_to_process = ["101", "102", "103"]
all_data = process_subjects(subjects_to_process)

with open('data.js', 'w') as f:
    f.write(f"const fallData = {json.dumps(all_data)};")

print(f"\nSuccessfully processed {len(all_data)} subjects.")
for sid, acts in all_data.items():
    print(f"Subject {sid}: {len(acts)} activities")

