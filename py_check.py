import py_compile, sys
files = ['server/db.py','server/relay_engine.py','server/routers/relay.py','server/routers/experiments.py']
errors = []
for f in files:
    try:
        py_compile.compile(f, doraise=True)
        print('OK:', f)
    except Exception as e:
        print('ERR:', f, str(e))
        errors.append(f)
sys.exit(1 if errors else 0)
