import yaml, glob
for f in sorted(glob.glob('C:/Users/User/Repositories/Babel/server/presets/*.yaml')):
    try:
        data = yaml.safe_load(open(f, encoding='utf-8'))
        print('OK:', f.split('/')[-1], '->', data.get('id'))
    except Exception as e:
        print('ERR:', f.split('/')[-1], '->', e)