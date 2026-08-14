/**
 * Deterministic demo scene for the sandboxed HyperFrames renderer. The HTML
 * receives `?frame=N&fps=F&width=W&height=H` and derives all animation from
 * the frame number, so every render is reproducible.
 */
export function demoHyperframeHtml(title: string): string {
  const safeTitle = title.replace(/[<>&"']/g, '');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  body {
    background: radial-gradient(1200px 700px at 50% 20%, #10213A 0%, #08111F 70%);
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #F8FAFC;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .title { font-size: 44px; font-weight: 800; margin-bottom: 40px; color: #F8FAFC; }
  .stage { display: flex; align-items: flex-end; gap: 28px; height: 300px; }
  .bar { width: 90px; border-radius: 10px 10px 0 0; background: linear-gradient(to top, #59D5E0, #8EE9F0); transition: none; }
  .label { text-align: center; margin-top: 10px; color: #9FB2C8; font-size: 18px; }
  .foot { margin-top: 44px; font-size: 20px; color: #9FB2C8; letter-spacing: 1px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="title">${safeTitle}</div>
  <div class="stage" id="stage"></div>
  <div class="foot" id="foot">Sandboxed HyperFrames · deterministic frame render</div>
  <script>
    (function () {
      const params = new URLSearchParams(location.search);
      const frame = Number(params.get('frame') || '0');
      const fps = Number(params.get('fps') || '30');
      const durationSeconds = 8;
      const progress = Math.min(1, frame / (fps * durationSeconds));
      const years = [0, 1, 2, 3, 4, 5, 6, 7];
      const values = [1000, 1050, 1103, 1158, 1216, 1276, 1340, 1407];
      const max = 1500;
      const stage = document.getElementById('stage');
      for (let i = 0; i < years.length; i++) {
        const p = Math.min(1, progress * (i + 1) / years.length);
        const h = Math.round(300 * (values[i] / max) * p);
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = h + 'px';
        bar.style.opacity = 0.35 + 0.65 * p;
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = 'Y' + years[i];
        const col = document.createElement('div');
        col.style.display = 'flex';
        col.style.flexDirection = 'column';
        col.style.alignItems = 'center';
        col.appendChild(bar);
        col.appendChild(label);
        stage.appendChild(col);
      }
      document.getElementById('foot').textContent =
        'frame ' + frame + ' · balance $' + Math.round(1000 * Math.pow(1.05, progress * 8)) + ' · sandboxed render';
    })();
  </script>
</body>
</html>`;
}
