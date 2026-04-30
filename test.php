<!DOCTYPE html>
<html>
<head>
<title>IoT Advanced Dashboard</title>

<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
body {
    margin: 0;
    font-family: Arial;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    color: white;
    text-align: center;
}

.header {
    padding: 20px;
    font-size: 28px;
    font-weight: bold;
}

.container {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 20px;
    flex-wrap: wrap;
}

.card {
    background: #111827;
    padding: 20px;
    border-radius: 15px;
    width: 180px;
    box-shadow: 0 0 15px rgba(0,0,0,0.5);
}

.value {
    font-size: 35px;
    color: #22c55e;
}

button {
    margin-top: 20px;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: #22c55e;
    font-weight: bold;
    cursor: pointer;
}

button:hover {
    background: #16a34a;
}

.chartBox {
    width: 85%;
    margin: 30px auto;
    background: #111827;
    padding: 20px;
    border-radius: 15px;
}
</style>

</head>

<body>

<div class="header">🌡️ IoT Professional Dashboard</div>

<div class="container">
    <div class="card">
        <h3>Temperature</h3>
        <div class="value" id="t">--</div>
        °C
    </div>

    <div class="card">
        <h3>Humidity</h3>
        <div class="value" id="h">--</div>
        %
    </div>

    <div class="card">
        <h3>Last Update</h3>
        <div id="time">--</div>
    </div>

    <div class="card">
        <h3>Avg Temp</h3>
        <div class="value" id="avgT">--</div>
    </div>

    <div class="card">
        <h3>Avg Humidity</h3>
        <div class="value" id="avgH">--</div>
    </div>
</div>

<button onclick="downloadCSV()">⬇ Download CSV</button>

<div class="chartBox">
    <canvas id="chart"></canvas>
</div>

<script>
const firebaseConfig = {
    databaseURL: "https://rk-tech-eb179-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();

// ===================== LIVE DATA =====================
const liveRef = db.ref("devices/device_1/live");

liveRef.on("value", (snapshot) => {
    const data = snapshot.val();

    if (data) {
        document.getElementById("t").innerText = data.temperature;
        document.getElementById("h").innerText = data.humidity;
        document.getElementById("time").innerText =
            new Date(data.time * 1000).toLocaleTimeString();
    }
});

// ===================== HISTORY =====================
const historyRef = db.ref("devices/device_1/history");

let tempData = [];
let humData = [];
let labels = [];

const ctx = document.getElementById("chart").getContext("2d");

const chart = new Chart(ctx, {
    type: "line",
    data: {
        labels: labels,
        datasets: [
            {
                label: "Temperature (°C)",
                data: tempData,
                borderColor: "#22c55e",
                fill: false
            },
            {
                label: "Humidity (%)",
                data: humData,
                borderColor: "#38bdf8",
                fill: false
            }
        ]
    }
});

// ===================== UPDATE HISTORY =====================
historyRef.limitToLast(15).on("value", (snapshot) => {
    const data = snapshot.val();

    tempData = [];
    humData = [];
    labels = [];

    let sumT = 0, sumH = 0;
    let count = 0;

    for (let key in data) {
        let item = data[key];

        tempData.push(parseFloat(item.temperature));
        humData.push(parseFloat(item.humidity));
        labels.push(new Date(item.time * 1000).toLocaleTimeString());

        sumT += parseFloat(item.temperature);
        sumH += parseFloat(item.humidity);
        count++;
    }

    document.getElementById("avgT").innerText = (sumT / count).toFixed(2);
    document.getElementById("avgH").innerText = (sumH / count).toFixed(2);

    chart.data.labels = labels;
    chart.data.datasets[0].data = tempData;
    chart.data.datasets[1].data = humData;

    chart.update();
});

// ===================== CSV DOWNLOAD =====================
function downloadCSV() {
    let csv = "Time,Temperature,Humidity\n";

    historyRef.once("value", (snapshot) => {
        const data = snapshot.val();

        for (let key in data) {
            let item = data[key];

            csv += `${new Date(item.time * 1000)},${item.temperature},${item.humidity}\n`;
        }

        let blob = new Blob([csv], { type: "text/csv" });
        let link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = "iot_data.csv";
        link.click();
    });
}
</script>

</body>
</html>
