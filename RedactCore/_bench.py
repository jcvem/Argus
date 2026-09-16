import statistics, time
from pathlib import Path
from redact_core.pipeline import RedactionPipeline
from redact_core.models import SubjectContext

root=Path(__file__).parent
pdf=root/"fixtures/sample_report.pdf"
docx=root/"fixtures/sample_report.docx"
pipe=RedactionPipeline()

def run(path, ext, n=10):
    data=path.read_bytes()
    times=[]
    # warmup
    sha,_,doc=pipe.ingest_document(data,path.name)
    for i in range(n):
        t=time.perf_counter()
        sha,_,doc=pipe.ingest_document(data,path.name)
        m,out=pipe.generate_derived_view(sha,ext,"sales-quarterly",SubjectContext(subject_id="bench",roles={"sales","viewer"}))
        times.append((time.perf_counter()-t)*1000)
    print(path.name, "n=",n, "median_ms=",round(statistics.median(times),2), "p95_ms=",round(statistics.quantiles(times,n=20)[18],2), "min_ms=",round(min(times),2), "max_ms=",round(max(times),2), "ops=",m.operation_counts)

run(pdf,"pdf")
run(docx,"docx")
