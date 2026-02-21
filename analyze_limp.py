
import json
import math

# Load data from data.js
with open('data.js', 'r') as f:
    content = f.read()
    json_str = content.replace('const fallData = ', '').rstrip(';')
    data = json.loads(json_str)

def analyze_activity(subject, activity_id):
    samples = data[subject][activity_id]["Waist"]
    accs = [math.sqrt(s['acc_x']**2 + s['acc_y']**2 + s['acc_z']**2) for s in samples]
    
    peaks = []
    for i in range(1, len(accs) - 1):
        if accs[i] > accs[i-1] and accs[i] > accs[i+1] and accs[i] > 11.0: # Filter low-level noise
            peaks.append(accs[i])
            
    avg_peak = sum(peaks) / len(peaks) if peaks else 0
    # Calculate std dev manually
    std_peak = math.sqrt(sum((p - avg_peak)**2 for p in peaks) / len(peaks)) if peaks else 0
    
    return {
        "avg_peak": round(avg_peak, 2),
        "std_peak": round(std_peak, 2),
        "peak_count": len(peaks)
    }

print("Subject 101 Analysis:")
s101_normal = analyze_activity("101", "801-Yurume Ileri")
s101_limp = analyze_activity("101", "807-Topallama")
print(f"  Normal: {s101_normal}")
print(f"  Limping: {s101_limp}")

print("\nSubject 103 Analysis (Test):")
s103_normal = analyze_activity("103", "801-Yurume Ileri")
s103_limp = analyze_activity("103", "807-Topallama")
print(f"  Normal: {s103_normal}")
print(f"  Limping: {s103_limp}")
