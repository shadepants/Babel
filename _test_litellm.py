import os
os.environ['LITELLM_LOCAL_MODEL_COST_MAP'] = 'True'
import litellm
print('OK version:', litellm.__version__)
