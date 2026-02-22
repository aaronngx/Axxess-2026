const fs = require('fs');
const path = require('path');

// Load data from data.js using absolute path
const content = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
const jsonStr = content.replace('const fallData = ', '').trim().replace(/;$/, '');
const data = JSON.parse(jsonStr);

function analyzeActivity(subject, activityId) {
    const samples = data[subject][activityId]["Waist"];
    const accs = samples.map(s => Math.sqrt(s.acc_x ** 2 + s.acc_y ** 2 + s.acc_z ** 2));

    const peaks = [];
    for (let i = 1; i < accs.length - 1; i++) {
        if (accs[i] > accs[i - 1] && accs[i] > accs[i + 1] && accs[i] > 11.0) {
            peaks.push(accs[i]);
        }
    }

    const avgPeak = peaks.length > 0 ? peaks.reduce((a, b) => a + b, 0) / peaks.length : 0;

    // Calculate std dev
    const variance = peaks.length > 0
        ? peaks.reduce((a, b) => a + Math.pow(b - avgPeak, 2), 0) / peaks.length
        : 0;
    const stdPeak = Math.sqrt(variance);

    return {
        avg_peak: parseFloat(avgPeak.toFixed(2)),
        std_peak: parseFloat(stdPeak.toFixed(2)),
        peak_count: peaks.length
    };
}

console.log("Subject 101 Analysis:");
const s101Normal = analyzeActivity("101", "801-Yurume Ileri");
const s101Limp = analyzeActivity("101", "807-Topallama");
console.log("  Normal:", s101Normal);
console.log("  Limping:", s101Limp);

console.log("\nSubject 103 Analysis (Test):");
const s103Normal = analyzeActivity("103", "801-Yurume Ileri");
const s103Limp = analyzeActivity("103", "807-Topallama");
console.log("  Normal:", s103Normal);
console.log("  Limping:", s103Limp);
