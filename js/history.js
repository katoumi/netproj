// history page script
const historyList = document.getElementById('historyList');
const clearBtn = document.getElementById('clearHistory');
const downloadBtn = document.getElementById('downloadHistory');

function render(){
  const history = JSON.parse(localStorage.getItem('netproj-history') || '[]');
  historyList.innerHTML = '';
  history.slice().reverse().forEach(h => {
    const li = document.createElement('li');
    li.innerHTML = `<div><div><strong>${h.type}</strong> — ${h.target||''}</div><div class="meta">${new Date(h.time).toLocaleString()}</div></div><div class="meta">${h.payload?JSON.stringify(h.payload):''}</div>`;
    historyList.appendChild(li);
  });
}

clearBtn.addEventListener('click', ()=>{ localStorage.removeItem('netproj-history'); render(); });
downloadBtn.addEventListener('click', ()=>{ const history = localStorage.getItem('netproj-history') || '[]'; const blob = new Blob([history], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'netproj-history.json'; a.click(); URL.revokeObjectURL(url); });

render();
