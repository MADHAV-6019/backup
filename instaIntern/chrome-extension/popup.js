document.getElementById('startBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({action: 'start_master'}, (response) => {
        document.getElementById('status').innerText = "Status: RUNNING";
        document.getElementById('status').style.color = "#0095f6";
    });
});

document.getElementById('stopBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({action: 'stop_master'}, (response) => {
        document.getElementById('status').innerText = "Status: STOPPED";
        document.getElementById('status').style.color = "#ed4956";
    });
});
