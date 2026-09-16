import time, statistics, subprocess
from pathlib import Path
root=Path(__file__).parent
for f in [root/"fixtures/sample_report.pdf", root/"fixtures/sample_report.docx"]:
 times=[]
 for i in range(5):
  out=Path('/tmp')/('redact-bench-'+f.suffix[1:])
  t=time.perf_counter()
  r=subprocess.run(['uv','run','redact-core','process',str(f),'--policy','sales-quarterly','--subject','bench','--output',str(out)],cwd=root,capture_output=True,text=True)
  times.append((time.perf_counter()-t)*1000)
 print(f.name, 'cli_median_ms=',round(statistics.median(times),2),'all=',[round(x,2) for x in times])
