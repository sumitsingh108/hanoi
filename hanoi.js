const state = {
      n: 4,
      pegs: [[], [], []], // arrays of numbers (disk sizes). 1 is smallest, n is biggest
      selected: null, // selected peg index
      moves: 0,
      history: [], // for reset
      busy: false,
    };

    // Utility: power of two minus one
    const minMoves = n => Math.pow(2, n) - 1;

    // Disk palette for pleasant gradient variety
    const colors = [
      ['#7dd3fc', '#22d3ee'], // sky -> cyan
      ['#a5b4fc', '#c084fc'], // indigo -> fuchsia
      ['#6ee7b7', '#34d399'], // green
      ['#fca5a5', '#f87171'], // red
      ['#fde68a', '#fbbf24'], // amber
      ['#93c5fd', '#60a5fa'], // blue
      ['#f9a8d4', '#f472b6'], // pink
      ['#c7d2fe', '#a78bfa'], // indigo
      ['#ddd6fe', '#c4b5fd'],
      ['#99f6e4', '#5eead4'],
    ];

    // DOM refs
    const elN = document.getElementById('n');
    const elNew = document.getElementById('newGame');
    const elReset = document.getElementById('reset');
    const elSolve = document.getElementById('solve');
    const elSpeed = document.getElementById('speed');
    const elMoves = document.getElementById('moves');
    const elMin = document.getElementById('minMoves');
    const elStatus = document.getElementById('status');

    const pegEls = [0,1,2].map(i => document.getElementById('peg'+i));

    function setStatus(text, cls){
      elStatus.textContent = text;
      elStatus.className = 'value' + (cls ? ' ' + cls : '');
    }

    // Initialize or reset board with n disks
    function init(n){
      state.n = n;
      state.pegs = [[], [], []];
      for (let size = n; size >= 1; size--) state.pegs[0].push(size);
      state.selected = null;
      state.moves = 0;
      state.history = [];
      state.busy = false;
      render();
      elMin.textContent = minMoves(n).toLocaleString();
      elMoves.textContent = '0';
      setStatus('Ready');
      elSolve.disabled = false;
    }

    // Render the three pegs
    function render(){
      for (let i=0;i<3;i++){
        const slot = pegEls[i];
        slot.innerHTML = '';
        const stack = state.pegs[i];
        stack.forEach((size, idx) => {
          const disk = document.createElement('div');
          disk.className = 'disk' + (idx === stack.length-1 ? ' top' : '');
          const frac = size / state.n; // 0..1
          const minW = 60; // px
          const maxW = Math.min(slot.clientWidth * 0.86, 320);
          const width = Math.max(minW, Math.floor(minW + frac * (maxW - minW)));
          disk.style.width = width + 'px';
          const pal = colors[(size-1) % colors.length];
          disk.style.background = `linear-gradient(180deg, ${pal[0]}, ${pal[1]})`;
          disk.textContent = size;
          slot.appendChild(disk);
        });
      }
      // highlight selected peg
      document.querySelectorAll('.peg').forEach((peg) => {
        const sel = Number(peg.dataset.peg) === state.selected;
        peg.style.outline = sel ? '2px solid rgba(34,211,238,.6)' : 'none';
        peg.style.boxShadow = sel ? 'inset 0 0 0 3px rgba(34,211,238,.25)' : 'none';
      });
    }

    // Apply a move if legal
    function tryMove(from, to, record=true){
      if (from === to) return false;
      const src = state.pegs[from];
      const dst = state.pegs[to];
      if (!src.length) return false;
      const disk = src[src.length-1];
      const top = dst[dst.length-1];
      if (top && top < disk) return false; // illegal
      src.pop();
      dst.push(disk);
      if (record) state.history.push([from, to]);
      state.moves++;
      elMoves.textContent = state.moves.toLocaleString();
      render();
      checkWin();
      return true;
    }

    function checkWin(){
      if (state.pegs[2].length === state.n) {
        setStatus('Solved! 🎉', 'win');
        elSolve.disabled = true;
        return true;
      }
      return false;
    }

    // Handle peg clicks (select source, then destination)
    document.getElementById('pegs').addEventListener('click', (e) => {
      if (state.busy) return; // ignore while animating
      const pegEl = e.target.closest('.peg');
      if (!pegEl) return;
      const i = Number(pegEl.dataset.peg);
      if (state.selected === null){
        // can only select if there is a disk
        if (state.pegs[i].length){
          state.selected = i; setStatus(`Selected peg ${i+1}`);
        }
      } else {
        const ok = tryMove(state.selected, i);
        if (!ok){ setStatus('Illegal move', 'error'); }
        else { setStatus(''); }
        state.selected = null;
      }
      render();
    });

    // Controls
    elNew.addEventListener('click', () => {
      const n = clamp(parseInt(elN.value || '4', 10), 3, 10);
      elN.value = n;
      init(n);
    });

    elReset.addEventListener('click', () => {
      // Replay history backwards
      if (state.busy) return;
      const n = state.n;
      init(n);
    });

    // Auto-solver
    elSolve.addEventListener('click', async () => {
      if (state.busy) return;
      state.busy = true; setStatus('Solving…');
      const moves = [];
      generateMoves(state.n, 0, 2, 1, moves); // from 0 -> 2 using 1 as aux
      const delayBase = 30; // ms per unit
      const speedFactor = 1000 - Number(elSpeed.value); // 0..1000 (lower is faster)
      const delay = Math.max(0, Math.floor(speedFactor * 0.8 + delayBase));
      for (const [from, to] of moves){
        await sleep(delay);
        tryMove(from, to, false);
      }
      state.busy = false;
      checkWin();
    });

    function generateMoves(n, from, to, aux, out){
      if (n === 1){ out.push([from, to]); return; }
      generateMoves(n-1, from, aux, to, out);
      out.push([from, to]);
      generateMoves(n-1, aux, to, from, out);
    }

    function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
    function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

    // Resize observer to re-render widths responsively
    const ro = new ResizeObserver(() => render());
    document.querySelectorAll('.slot').forEach(el => ro.observe(el));

    // Kick off
    init(state.n);