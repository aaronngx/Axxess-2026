import json

# Read the original large JSON chunk
print("Reading original data...")
with open('data.js', 'r') as f:
    content = f.read()
    json_str = content.replace('const fallData = ', '').rstrip(';')
    data = json.loads(json_str)

# Filter targets
subjects = ["101", "103"]
activities = ["801-Yurume Ileri", "807-Topallama"]

filtered_data = {}

for sub in subjects:
    if sub in data:
        filtered_data[sub] = {}
        for act in activities:
            if act in data[sub]:
                # We only need waist data
                filtered_data[sub][act] = {"Waist": data[sub][act].get("Waist", [])}

# Write out tiny subset for Mobile App
out_content = "export const fallData: any = " + json.dumps(filtered_data, separators=(',', ':')) + ";"
with open('frontend/AIHealthPartnerRN/src/data/fallData.ts', 'w') as f:
    f.write(out_content)

print("Created minimized fallData.ts")
